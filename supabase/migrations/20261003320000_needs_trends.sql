-- Trendy potrzeb: kategorie i miejsce zapisywane przy każdym zgłoszeniu z matchmakingu (agregacja w panelu ROPS)
alter table public.needs
  add column categories text[] not null default '{}',
  add column target_groups text[] not null default '{}',
  add column district text;
create index on public.needs using gin (categories);
create index on public.needs (created_at desc);

-- „Podobne zgłoszenia” w matchmakingu: zanonimizowane streszczenia + kategorie (bez autora i surowego tekstu)
drop function if exists public.match_needs(extensions.vector, int, real);
create or replace function public.match_needs(
  query_embedding extensions.vector(1536),
  match_count int default 5,
  min_similarity real default 0.5
)
returns table (id bigint, summary text, categories text[], district text, created_at timestamptz, similarity real)
language sql stable security definer set search_path = public, extensions as $$
  select n.id, n.summary, n.categories, n.district, n.created_at,
         (1 - (n.embedding <=> query_embedding))::real as similarity
  from public.needs n
  where n.embedding is not null and n.summary is not null
    and 1 - (n.embedding <=> query_embedding) >= min_similarity
  order by n.embedding <=> query_embedding
  limit match_count;
$$;
