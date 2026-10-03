-- Strefa JST: leady gmin (kontakt na starcie rozmowy grantowej) + wyszukiwanie w dokumentach konkretnego naboru

create table public.jst_leads (
  id uuid primary key default gen_random_uuid(),
  session_key text,
  user_id uuid references auth.users on delete set null,
  institution text not null,                -- np. „Gmina Bukowina Tatrzańska - GOPS”
  institution_type text,                    -- gmina / powiat / OPS / CUS / NGO
  contact_name text,
  email text,
  phone text,
  consent_contact boolean not null default true,
  program text not null default 'usluga_wrazliwa',
  consultant_session_id uuid references public.consultant_sessions on delete set null,
  -- podsumowanie AI rozmowy (dla ROPS): gotowość, zainteresowanie, bariery, następny krok
  summary text,
  interested_in text,
  readiness text check (readiness in ('wysoka', 'srednia', 'niska')),
  blockers text[] not null default '{}',
  next_step text,
  status text not null default 'nowy' check (status in ('nowy', 'w_rozmowie', 'kontakt_rops', 'wniosek', 'zamkniety')),
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index on public.jst_leads (created_at desc);
alter table public.jst_leads enable row level security;
create policy "admin leads" on public.jst_leads for select using (public.is_admin());
create policy "admin leads update" on public.jst_leads for update using (public.is_admin());

-- match_chunks z opcjonalnym filtrem dokumentów po prefiksie source_id (np. 'uw:' = nabór Usługa Wrażliwa)
drop function if exists public.match_chunks(extensions.vector, text, int);
create or replace function public.match_chunks(
  query_embedding extensions.vector(1536),
  query_text text,
  match_count int default 8,
  source_prefix text default null
)
returns table (chunk_id bigint, document_id bigint, document_title text, source_url text,
               page_from int, page_to int, heading text, content text, score real)
language sql stable set search_path = public, extensions as $$
  with q as (select public.or_tsquery(query_text) as tsq),
  docs as (select id from public.documents where source_prefix is null or source_id like source_prefix || '%'),
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
