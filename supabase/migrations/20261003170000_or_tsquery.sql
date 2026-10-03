-- Zapytania FTS jako OR słów (≥ 3 znaki) zamiast AND z websearch_to_tsquery:
-- opis problemu użytkownika jest długi, więc wymaganie wszystkich słów dawało zerowe trafienia.

create or replace function public.or_tsquery(txt text) returns tsquery
language sql immutable set search_path = public, extensions as $$
  select coalesce(
    nullif(
      array_to_string(
        array(
          select distinct w
          from regexp_split_to_table(extensions.unaccent('extensions.unaccent', lower(coalesce(txt, ''))), '[^a-z0-9]+') as w
          where length(w) >= 3
          limit 40
        ),
        ' | '
      ),
      ''
    ),
    'xyznomatch'
  )::tsquery;
$$;

create or replace function public.match_innovations(
  query_embedding extensions.vector(1536),
  query_text text,
  filter_categories text[] default null,
  filter_target_groups text[] default null,
  match_count int default 20
)
returns table (id bigint, title text, summary text, problem text, categories text[], target_groups text[],
               location text, stage text, is_sample boolean, semantic real, lexical real, meta real, score real)
language sql stable set search_path = public, extensions as $$
  with q as (select public.or_tsquery(query_text) as tsq),
  scored as (
    select i.id, i.title, i.summary, i.problem, i.categories, i.target_groups, i.location, i.stage, i.is_sample,
           (1 - (i.embedding <=> query_embedding))::real as semantic,
           least(ts_rank_cd(i.fts, q.tsq, 32) * 4, 1)::real as lexical,
           ((case when filter_categories is not null and i.categories && filter_categories then 0.6 else 0 end)
          + (case when filter_target_groups is not null and i.target_groups && filter_target_groups then 0.4 else 0 end))::real as meta
    from public.innovations i, q
    where i.published and i.embedding is not null
    order by i.embedding <=> query_embedding
    limit greatest(match_count * 3, 50)
  )
  select id, title, summary, problem, categories, target_groups, location, stage, is_sample,
         semantic, lexical, meta,
         (0.65 * semantic + 0.2 * lexical + 0.15 * meta)::real as score
  from scored
  order by score desc
  limit match_count;
$$;

create or replace function public.match_chunks(
  query_embedding extensions.vector(1536),
  query_text text,
  match_count int default 8
)
returns table (chunk_id bigint, document_id bigint, document_title text, source_url text,
               page_from int, page_to int, heading text, content text, score real)
language sql stable set search_path = public, extensions as $$
  with q as (select public.or_tsquery(query_text) as tsq),
  vec as (
    select c.id, row_number() over (order by c.embedding <=> query_embedding) as r
    from public.document_chunks c
    where c.embedding is not null
    order by c.embedding <=> query_embedding
    limit 40
  ),
  lex as (
    select c.id, row_number() over (order by ts_rank_cd(c.fts, q.tsq) desc) as r
    from public.document_chunks c, q
    where c.fts @@ q.tsq
    order by ts_rank_cd(c.fts, q.tsq) desc
    limit 40
  ),
  fused as (
    select coalesce(vec.id, lex.id) as id,
           coalesce(1.0 / (60 + vec.r), 0) + coalesce(1.0 / (60 + lex.r), 0) as rrf
    from vec full outer join lex on vec.id = lex.id
  )
  select c.id, d.id, d.title, d.source_url, c.page_from, c.page_to, c.heading, c.content, f.rrf::real
  from fused f
  join public.document_chunks c on c.id = f.id
  join public.documents d on d.id = c.document_id
  order by f.rrf desc
  limit match_count;
$$;
