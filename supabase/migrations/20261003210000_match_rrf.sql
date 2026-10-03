-- Matchmaking: fuzja RRF (Reciprocal Rank Fusion) zamiast średniej ważonej.
-- Średnia zaniżała rzadkie, bardzo trafne słowa (np. „spastyczność” → Edki dopiero #8).
-- RRF liczy się z pozycji w rankingu semantycznym i leksykalnym + premia za zgodność kategorii/grup.

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
  sem as (
    select i.id, (1 - (i.embedding <=> query_embedding))::real as semantic,
           row_number() over (order by i.embedding <=> query_embedding) as r
    from public.innovations i
    where i.published and i.embedding is not null
    order by i.embedding <=> query_embedding
    limit 60
  ),
  lex as (
    select i.id, least(ts_rank_cd(i.fts, q.tsq, 32) * 4, 1)::real as lexical,
           row_number() over (order by ts_rank_cd(i.fts, q.tsq, 32) desc) as r
    from public.innovations i, q
    where i.published and i.fts @@ q.tsq
    order by ts_rank_cd(i.fts, q.tsq, 32) desc
    limit 60
  ),
  fused as (
    select coalesce(sem.id, lex.id) as id,
           coalesce(sem.semantic, 0) as semantic,
           coalesce(lex.lexical, 0) as lexical,
           coalesce(1.0 / (50 + sem.r), 0) + coalesce(1.0 / (50 + lex.r), 0) as rrf
    from sem full outer join lex on sem.id = lex.id
  )
  select i.id, i.title, i.summary, i.problem, i.categories, i.target_groups, i.location, i.stage, i.is_sample,
         f.semantic, f.lexical,
         ((case when filter_categories is not null and i.categories && filter_categories then 0.6 else 0 end)
        + (case when filter_target_groups is not null and i.target_groups && filter_target_groups then 0.4 else 0 end))::real as meta,
         -- RRF przeskalowane do ~0-1 (maks. 2/51) + do 0.15 premii za metadane
         (f.rrf * 25.5 * 0.85
          + 0.15 * ((case when filter_categories is not null and i.categories && filter_categories then 0.6 else 0 end)
                  + (case when filter_target_groups is not null and i.target_groups && filter_target_groups then 0.4 else 0 end)))::real as score
  from fused f
  join public.innovations i on i.id = f.id
  order by score desc
  limit match_count;
$$;
