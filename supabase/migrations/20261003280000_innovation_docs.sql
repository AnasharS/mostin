-- Dokumentacja modeli innowacji (paczki ZIP z Biblioteki ROPS) przypięta do innowacji + wyszukiwanie w dokumentach jednej innowacji
alter table public.documents add column innovation_id bigint references public.innovations on delete cascade;
create index on public.documents (innovation_id);
alter table public.documents drop constraint if exists documents_kind_check;
alter table public.documents add constraint documents_kind_check
  check (kind in ('report', 'regulation', 'challenge_map', 'guide', 'call_rules', 'innovation_model', 'other'));

drop function if exists public.match_chunks(extensions.vector, text, int, text);
create or replace function public.match_chunks(
  query_embedding extensions.vector(1536),
  query_text text,
  match_count int default 8,
  source_prefix text default null,
  filter_innovation bigint default null
)
returns table (chunk_id bigint, document_id bigint, document_title text, source_url text,
               page_from int, page_to int, heading text, content text, score real)
language sql stable set search_path = public, extensions as $$
  with q as (select public.or_tsquery(query_text) as tsq),
  docs as (
    select id from public.documents
    where (source_prefix is null or source_id like source_prefix || '%')
      and (filter_innovation is null or innovation_id = filter_innovation)
  ),
  vec as (
    select c.id, row_number() over (order by c.embedding <=> query_embedding) as r
    from public.document_chunks c
    where c.embedding is not null and c.document_id in (select id from docs)
    order by c.embedding <=> query_embedding
    limit 40
  ),
  lex as (
    select c.id, row_number() over (order by ts_rank_cd(c.fts, q.tsq) desc) as r
    from public.document_chunks c, q
    where c.fts @@ q.tsq and c.document_id in (select id from docs)
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
