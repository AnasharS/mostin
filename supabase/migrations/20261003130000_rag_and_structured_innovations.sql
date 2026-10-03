-- MOSTIN: Knowledge RAG (dokumenty → chunki ze stronami) + ustrukturyzowane innowacje (ingestion przez LLM)

-- ───────────────────────── innowacje: pola z normalizacji LLM ─────────────────────────

alter table public.innovations
  add column problem text,
  add column needs text[] not null default '{}',
  add column categories text[] not null default '{}',
  add column location text,
  add column implementation_requirements text,
  add column resources text,
  add column structured jsonb,              -- pełny wynik normalizacji (do podglądu w CMS)
  add column search_text text,              -- zoptymalizowany tekst, który embedujemy
  add column ingest_status text not null default 'pending'
    check (ingest_status in ('pending', 'processing', 'ready', 'error')),
  add column ingest_error text,
  add column ingested_at timestamptz;

alter table public.innovations drop column fts;
alter table public.innovations add column fts tsvector generated always as (
  public.pl_fts(title || ' ' || summary || ' ' || coalesce(search_text, coalesce(description, '')))
) stored;
create index on public.innovations using gin (fts);
create index on public.innovations using gin (categories);
create index on public.innovations using gin (target_groups);

-- ───────────────────────── dokumenty (Knowledge RAG) ─────────────────────────

create table public.documents (
  id bigserial primary key,
  title text not null,
  kind text not null default 'report'
    check (kind in ('report', 'regulation', 'challenge_map', 'guide', 'call_rules', 'other')),
  description text,
  source_url text,
  storage_path text,                        -- plik w bucketcie 'documents'
  published_on date,
  page_count int,
  area_ids int[] not null default '{}',
  is_sample boolean not null default false,
  ingest_status text not null default 'pending'
    check (ingest_status in ('pending', 'processing', 'ready', 'error')),
  ingest_error text,
  ingested_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.document_chunks (
  id bigserial primary key,
  document_id bigint not null references public.documents on delete cascade,
  chunk_index int not null,
  page_from int,
  page_to int,
  heading text,
  content text not null,
  embedding extensions.vector(1536),
  fts tsvector generated always as (public.pl_fts(coalesce(heading, '') || ' ' || content)) stored,
  unique (document_id, chunk_index)
);

create index on public.document_chunks using hnsw (embedding extensions.vector_cosine_ops);
create index on public.document_chunks using gin (fts);

alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
create policy "public read" on public.documents for select using (true);
create policy "public read" on public.document_chunks for select using (true);
create policy "admin write" on public.documents for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.document_chunks for all using (public.is_admin()) with check (public.is_admin());

-- Hybrydowe wyszukiwanie fragmentów dokumentów (RRF: vector + FTS)
create or replace function public.match_chunks(
  query_embedding extensions.vector(1536),
  query_text text,
  match_count int default 8
)
returns table (chunk_id bigint, document_id bigint, document_title text, source_url text,
               page_from int, page_to int, heading text, content text, score real)
language sql stable set search_path = public, extensions as $$
  with q as (
    select websearch_to_tsquery('simple', extensions.unaccent('extensions.unaccent', lower(coalesce(query_text, '')))) as tsq
  ),
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

-- ───────────────────────── matchmaking: hybryda + filtry metadanych ─────────────────────────

drop function if exists public.match_innovations(extensions.vector, text, int, int);

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
  with q as (
    select websearch_to_tsquery('simple', extensions.unaccent('extensions.unaccent', lower(coalesce(query_text, '')))) as tsq
  ),
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

-- ───────────────────────── storage ─────────────────────────

insert into storage.buckets (id, name, public) values
  ('documents', 'documents', true),
  ('media', 'media', true)
on conflict (id) do nothing;

create policy "public read files" on storage.objects for select
  using (bucket_id in ('documents', 'media'));
create policy "admin upload files" on storage.objects for insert
  with check (bucket_id in ('documents', 'media') and public.is_admin());
create policy "admin update files" on storage.objects for update
  using (bucket_id in ('documents', 'media') and public.is_admin());
create policy "admin delete files" on storage.objects for delete
  using (bucket_id in ('documents', 'media') and public.is_admin());
