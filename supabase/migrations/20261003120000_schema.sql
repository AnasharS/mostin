-- Splot / HubMi — schemat bazowy
-- Postgres w Supabase nie ma słownika polskiego, więc FTS = 'simple' + unaccent.

create extension if not exists vector with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ───────────────────────── słowniki ─────────────────────────

create type public.user_role as enum ('resident', 'ngo', 'jst', 'expert', 'admin');

create table public.areas (
  id serial primary key,
  slug text unique not null,
  name text not null,
  description text
);

create table public.regions (
  id serial primary key,
  teryt text unique,
  name text not null,
  type text not null check (type in ('gmina', 'powiat', 'region'))
);

-- ───────────────────────── użytkownicy ─────────────────────────

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role public.user_role not null default 'resident',
  display_name text,
  organization text,
  region_id int references public.regions,
  expertise_area_ids int[] not null default '{}',
  plain_language boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_expert_or_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('expert', 'admin'));
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── wiedza ─────────────────────────

create or replace function public.pl_fts(txt text) returns tsvector
language sql immutable as $$
  select to_tsvector('simple', extensions.unaccent('extensions.unaccent', lower(coalesce(txt, ''))));
$$;

create table public.challenges (
  id bigserial primary key,
  source_id text unique,
  area_id int references public.areas,
  region_id int references public.regions,
  title text not null,
  summary text not null,
  indicators jsonb not null default '[]',
  source_label text,
  source_url text,
  is_sample boolean not null default false,
  embedding extensions.vector(1536),
  fts tsvector generated always as (public.pl_fts(title || ' ' || summary)) stored,
  updated_at timestamptz not null default now()
);

create table public.innovations (
  id bigserial primary key,
  source_id text unique,
  title text not null,
  summary text not null,
  description text,
  area_ids int[] not null default '{}',
  target_groups text[] not null default '{}',
  stage text check (stage in ('pomysl', 'prototyp', 'testowana', 'wdrozona', 'upowszechniana')),
  media jsonb not null default '[]',      -- [{type:'video'|'image'|'pdf', url, title}]
  author_org text,
  contact text,
  region_id int references public.regions,
  source_label text,
  source_url text,
  is_sample boolean not null default false,
  published boolean not null default true,
  embedding extensions.vector(1536),
  fts tsvector generated always as (public.pl_fts(title || ' ' || summary || ' ' || coalesce(description, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.materials (
  id bigserial primary key,
  source_id text unique,
  title text not null,
  summary text,
  kind text not null check (kind in ('guide', 'canvas', 'video', 'report', 'course')),
  url text,
  area_ids int[] not null default '{}',
  is_sample boolean not null default false,
  embedding extensions.vector(1536),
  fts tsvector generated always as (public.pl_fts(title || ' ' || coalesce(summary, ''))) stored,
  created_at timestamptz not null default now()
);

-- ───────────────────────── potrzeby i dopasowania ─────────────────────────

create table public.needs (
  id bigserial primary key,
  author_id uuid references auth.users on delete set null,
  raw_text text not null,
  summary text,
  area_id int references public.areas,
  region_id int references public.regions,
  target_group text,
  keywords text[] not null default '{}',
  status text not null default 'new' check (status in ('new', 'in_review', 'matched', 'closed')),
  is_sample boolean not null default false,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now()
);

create table public.matches (
  id bigserial primary key,
  need_id bigint not null references public.needs on delete cascade,
  innovation_id bigint not null references public.innovations on delete cascade,
  score real not null,
  rationale text,
  adaptation text,
  confidence text check (confidence in ('wysoka', 'srednia', 'niska')),
  feedback text check (feedback in ('up', 'down')),
  created_at timestamptz not null default now(),
  unique (need_id, innovation_id)
);

-- ───────────────────────── kreator ─────────────────────────

create table public.ideas (
  id bigserial primary key,
  author_id uuid references auth.users on delete set null,
  title text not null,
  essence text not null,
  audience text,
  stage text,
  area_id int references public.areas,
  visual_url text,
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'in_review', 'accepted', 'rejected')),
  is_sample boolean not null default false,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now()
);

create table public.calls (
  id bigserial primary key,
  title text not null,
  description text,
  rules jsonb not null default '{}',     -- {kryteria:[], max_kwota, sekcje_wniosku:[]}
  opens_at date,
  closes_at date,
  active boolean not null default true,
  is_sample boolean not null default false
);

create table public.applications (
  id bigserial primary key,
  idea_id bigint not null references public.ideas on delete cascade,
  call_id bigint not null references public.calls on delete cascade,
  author_id uuid references auth.users on delete set null,
  content jsonb not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  created_at timestamptz not null default now()
);

-- ───────────────────────── tester ─────────────────────────

create table public.tests (
  id bigserial primary key,
  innovation_id bigint not null references public.innovations on delete cascade,
  title text not null,
  description text,
  slots int,
  opens_at date,
  closes_at date
);

create table public.test_signups (
  id bigserial primary key,
  test_id bigint not null references public.tests on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (test_id, user_id)
);

create table public.reviews (
  id bigserial primary key,
  innovation_id bigint not null references public.innovations on delete cascade,
  user_id uuid references auth.users on delete set null,
  rating int not null check (rating between 1 and 5),
  feedback text,
  improvement text,
  created_at timestamptz not null default now()
);

-- ───────────────────────── komunikacja ─────────────────────────

create table public.threads (
  id bigserial primary key,
  kind text not null check (kind in ('question', 'mentoring', 'partnership', 'handoff')),
  subject text not null,
  created_by uuid references auth.users on delete set null,
  related_type text,
  related_id bigint,
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  created_at timestamptz not null default now()
);

create table public.thread_members (
  thread_id bigint references public.threads on delete cascade,
  user_id uuid references auth.users on delete cascade,
  primary key (thread_id, user_id)
);

create table public.messages (
  id bigserial primary key,
  thread_id bigint not null references public.threads on delete cascade,
  author_id uuid references auth.users on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ───────────────────────── AI ─────────────────────────

create table public.consultant_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  messages jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_usage (
  id bigserial primary key,
  user_id uuid references auth.users on delete set null,
  route text not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_read_tokens int not null default 0,
  units real not null default 0,          -- minuty audio / liczba obrazów
  cost_usd numeric(10, 5) not null default 0,
  created_at timestamptz not null default now()
);

-- ───────────────────────── indeksy ─────────────────────────

create index on public.innovations using hnsw (embedding extensions.vector_cosine_ops);
create index on public.challenges using hnsw (embedding extensions.vector_cosine_ops);
create index on public.materials using hnsw (embedding extensions.vector_cosine_ops);
create index on public.needs using hnsw (embedding extensions.vector_cosine_ops);
create index on public.innovations using gin (fts);
create index on public.challenges using gin (fts);
create index on public.materials using gin (fts);
create index on public.innovations using gin (area_ids);
create index on public.needs (area_id, created_at);
create index on public.messages (thread_id, created_at);
create index on public.notifications (user_id, read_at);
