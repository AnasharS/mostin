-- Profil potrzeb (za zgodą) → lista oczekujących na testy + Przęsła (łączenie osób w podobnej sytuacji)
-- Dane kontaktowe NIGDY nie trafiają do modeli AI - trzymane osobno, widoczne tylko dla właściciela i ROPS.

create table public.needs_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  session_key text,                                  -- anonimowi odwiedzający (demo bez logowania)
  nickname text not null,                            -- pseudonim w Przęsłach
  categories text[] not null default '{}',
  target_groups text[] not null default '{}',
  situation text,                                    -- krótki opis sytuacji (bez danych osobowych)
  district text,                                     -- dzielnica / gmina
  region_label text,                                 -- np. „Kraków - Nowa Huta”
  embedding extensions.vector(1536),
  consent_tests boolean not null default false,      -- powiadom, gdy pojawi się innowacja do testów
  consent_przesla boolean not null default false,    -- pokaż mnie (anonimowo) osobom w podobnej sytuacji
  source text not null default 'form' check (source in ('form', 'mostek', 'voice')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.needs_profiles using gin (categories);
create index on public.needs_profiles (district);
create index on public.needs_profiles using hnsw (embedding extensions.vector_cosine_ops);

create table public.profile_contacts (
  profile_id uuid primary key references public.needs_profiles on delete cascade,
  email text,
  phone text,
  preferred text check (preferred in ('email', 'telefon', 'tylko_w_serwisie'))
);

-- testy: status gotowości + kategorie do dopasowania listy oczekujących
alter table public.tests
  add column status text not null default 'planned' check (status in ('planned', 'open', 'closed')),
  add column categories text[] not null default '{}',
  add column target_groups text[] not null default '{}',
  add column location text,
  add column created_at timestamptz not null default now();

create table public.test_invitations (
  id bigserial primary key,
  test_id bigint not null references public.tests on delete cascade,
  profile_id uuid not null references public.needs_profiles on delete cascade,
  match_reason text,
  status text not null default 'sent' check (status in ('sent', 'seen', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (test_id, profile_id)
);

-- Przęsła: kręgi wsparcia (grupy osób w podobnej sytuacji), rozmowy pod pseudonimem
create table public.circles (
  id bigserial primary key,
  title text not null,
  topic text,                                        -- np. „rodzice dzieci ze spastycznością”
  categories text[] not null default '{}',
  district text,
  region_label text,
  created_by uuid references public.needs_profiles on delete set null,
  meeting_note text,                                 -- propozycja spotkania (gdy grupa zechce)
  created_at timestamptz not null default now()
);
create table public.circle_members (
  circle_id bigint references public.circles on delete cascade,
  profile_id uuid references public.needs_profiles on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (circle_id, profile_id)
);
create table public.circle_messages (
  id bigserial primary key,
  circle_id bigint not null references public.circles on delete cascade,
  profile_id uuid references public.needs_profiles on delete set null,
  nickname text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index on public.circle_messages (circle_id, created_at);

alter table public.needs_profiles enable row level security;
alter table public.profile_contacts enable row level security;
alter table public.test_invitations enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.circle_messages enable row level security;
-- dostęp przez serwer (klucz sesji / user id) + odczyt dla ROPS
create policy "own profile" on public.needs_profiles for select using (user_id = auth.uid() or public.is_admin());
create policy "admin contacts" on public.profile_contacts for select using (public.is_admin());
create policy "admin invitations" on public.test_invitations for select using (public.is_admin());
create policy "public circles" on public.circles for select using (true);

-- Ile osób w podobnej sytuacji (anonimowo, tylko liczby) - zgoda consent_przesla
create or replace function public.przesla_similar(p_profile uuid, p_district text default null)
returns table (same_district bigint, region bigint)
language sql stable security definer set search_path = public, extensions as $$
  with me as (select categories, embedding from public.needs_profiles where id = p_profile)
  select
    count(*) filter (where np.district is not null and np.district = p_district),
    count(*)
  from public.needs_profiles np, me
  where np.id <> p_profile and np.consent_przesla
    and (np.categories && me.categories or (np.embedding is not null and me.embedding is not null and 1 - (np.embedding <=> me.embedding) > 0.55));
$$;

alter publication supabase_realtime add table public.circle_messages;
