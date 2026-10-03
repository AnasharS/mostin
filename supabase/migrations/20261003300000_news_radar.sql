-- Aktualności + radar naborów (odliczanie, szybki test kwalifikacji, przedwstępny wniosek)

create table public.news (
  id bigserial primary key,
  title text not null,
  lead text not null,
  body text,
  kind text not null default 'informacja' check (kind in ('nabor', 'wyniki', 'wydarzenie', 'innowacja', 'informacja')),
  audience text[] not null default '{wszyscy}',      -- wszyscy | jst | organizacje | mieszkancy
  call_id bigint references public.calls on delete set null,
  source_url text,
  is_sample boolean not null default false,
  pinned boolean not null default false,
  published_at timestamptz not null default now()
);
alter table public.news enable row level security;
create policy "public read" on public.news for select using (true);
create policy "admin write" on public.news for all using (public.is_admin()) with check (public.is_admin());

alter table public.calls
  add column audience text[] not null default '{wszyscy}',
  add column amount_label text,                      -- np. „do 600 000 zł” (z cytatem w amount_source)
  add column amount_source text,
  add column source_url text,
  add column eligibility_check text;                 -- klucz zestawu pytań kwalifikacji (np. 'usluga_wrazliwa')

create table public.pre_applications (
  id uuid primary key default gen_random_uuid(),
  call_id bigint references public.calls on delete set null,
  lead_id uuid references public.jst_leads on delete set null,
  session_key text,
  institution text not null,
  innovation_id bigint references public.innovations on delete set null,
  beneficiaries text,
  team text,
  partners text,
  need text,
  eligibility jsonb not null default '{}',           -- odpowiedzi testu kwalifikacji
  status text not null default 'nowy' check (status in ('nowy', 'w_analizie', 'zaproszony', 'odrzucony')),
  created_at timestamptz not null default now()
);
alter table public.pre_applications enable row level security;
create policy "admin read" on public.pre_applications for select using (public.is_admin());

-- korekta: daty naboru IWS 2.0 nie pochodziły ze źródła ROPS - usuwamy je (termin wg ogłoszenia ROPS)
update public.calls set opens_at = null, closes_at = null where title like 'Inkubator Włączenia Społecznego 2.0%';
