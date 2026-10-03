-- Middleman Innowacji: plany adaptacji innowacji do konkretnej instytucji

create table public.adaptation_plans (
  id uuid primary key default gen_random_uuid(),
  innovation_id bigint not null references public.innovations on delete cascade,
  user_id uuid references auth.users on delete set null,
  session_key text,
  context jsonb not null,          -- typ instytucji, odbiorcy, zasoby, budżet, ograniczenia
  plan jsonb not null,             -- wynik AI (struktura)
  shared_with_rops boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.adaptation_plans (innovation_id);

alter table public.adaptation_plans enable row level security;
create policy "own plans" on public.adaptation_plans for select
  using (user_id = auth.uid() or public.is_expert_or_admin());
-- zapis wyłącznie przez serwer (po guardzie AI), więc brak polityki insert dla klientów
