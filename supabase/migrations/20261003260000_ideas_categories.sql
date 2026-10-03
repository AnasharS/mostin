-- Pomysły wg kategorii (wspólna taksonomia) + kategorie naborów → powiadomienia autorów przy ogłoszeniu grantu
alter table public.ideas add column categories text[] not null default '{}';
create index on public.ideas using gin (categories);
alter table public.calls add column categories text[] not null default '{}';
create table public.call_notifications (
  call_id bigint references public.calls on delete cascade,
  idea_id bigint references public.ideas on delete cascade,
  created_at timestamptz not null default now(),
  primary key (call_id, idea_id)
);
alter table public.call_notifications enable row level security;
create policy "admin read" on public.call_notifications for select using (public.is_admin());
