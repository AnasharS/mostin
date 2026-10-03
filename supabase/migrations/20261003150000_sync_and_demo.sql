-- Synchronizacja ze źródłami zewnętrznymi (importer liczy hash treści; zmiana → ponowna ekstrakcja LLM)
-- + persony demo (anonimowe sesje Supabase zamiast login walla)

alter table public.innovations
  add column solution text,
  add column source_type text not null default 'manual',      -- manual | rops_library | csv | api
  add column source_hash text,                                -- sha256 znormalizowanej treści źródła
  add column source_updated_at timestamptz,                   -- data zmiany po stronie źródła (jeśli znana)
  add column last_synced_at timestamptz;

alter table public.documents
  add column source_id text unique,
  add column source_type text not null default 'manual',
  add column source_hash text,
  add column source_updated_at timestamptz,
  add column last_synced_at timestamptz;

alter table public.challenges
  add column source_type text not null default 'manual',
  add column source_hash text,
  add column last_synced_at timestamptz;

alter table public.materials
  add column source_type text not null default 'manual',
  add column source_hash text,
  add column last_synced_at timestamptz;

-- Dziennik przebiegów importera - widoczny w panelu ROPS
create table public.sync_runs (
  id bigserial primary key,
  source text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'error')),
  stats jsonb not null default '{}',         -- {fetched, unchanged, created, updated, failed}
  error text
);
alter table public.sync_runs enable row level security;
create policy "admin read" on public.sync_runs for select using (public.is_admin());

-- Persony demo
alter table public.profiles add column demo_persona text;

-- Trigger profilu: konta anonimowe nie mają e-maila
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'Gość'));
  return new;
end;
$$;
