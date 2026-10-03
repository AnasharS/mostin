-- Przęsła: anonimowość domyślnie, bliskość z wyboru.
-- Wymiana kontaktów tylko po obopólnej zgodzie; zgłoszenia od uczestników (ROPS nie czyta rozmów, widzi tylko zgłoszone wiadomości);
-- oznaczenie wiadomości kryzysowych (pod nimi pokazujemy telefony wsparcia - wiadomość nie jest blokowana).

alter table public.circle_messages
  add column hidden boolean not null default false,   -- ukryta przez ROPS po zgłoszeniu
  add column crisis boolean not null default false;   -- treść sugeruje kryzys - pokaż numery pomocy

create table public.circle_contact_requests (
  id bigserial primary key,
  circle_id bigint not null references public.circles on delete cascade,
  from_profile uuid not null references public.needs_profiles on delete cascade,
  to_profile uuid not null references public.needs_profiles on delete cascade,
  from_contact text not null,                          -- widoczny dla adresata dopiero po akceptacji
  to_contact text,                                     -- podawany przy akceptacji
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (from_profile, to_profile),
  check (from_profile <> to_profile)
);
create index on public.circle_contact_requests (to_profile, status);

create table public.circle_reports (
  id bigserial primary key,
  circle_id bigint not null references public.circles on delete cascade,
  message_id bigint not null references public.circle_messages on delete cascade,
  reporter_profile uuid references public.needs_profiles on delete set null,
  reason text,
  status text not null default 'new' check (status in ('new', 'handled')),
  created_at timestamptz not null default now(),
  unique (message_id, reporter_profile)
);

alter table public.circle_contact_requests enable row level security;
alter table public.circle_reports enable row level security;
-- dostęp wyłącznie przez serwer (klucz sesji profilu); zgłoszenia czyta ROPS
create policy "admin reports" on public.circle_reports for select using (public.is_admin());
