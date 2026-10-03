-- Polityka AI ustawiana przez ROPS („kaganiec”) + limity kosztów + dziennik moderacji

create table public.ai_policy (
  id int primary key default 1 check (id = 1),          -- pojedynczy rekord
  -- moderacja wejścia/wyjścia
  block_profanity boolean not null default true,
  block_insults boolean not null default true,
  mask_personal_data boolean not null default true,
  -- zakres odpowiedzi
  only_allowed_sources boolean not null default true,   -- odpowiedzi wyłącznie z bazy MOSTIN (narzędzia/RAG)
  allowed_sources text[] not null default '{innovations,documents,challenges,materials,calls}',
  avoid_medical_advice boolean not null default true,
  avoid_legal_advice boolean not null default true,
  avoid_politics boolean not null default true,
  avoid_religion boolean not null default true,
  avoid_off_topic boolean not null default true,        -- tematy spoza polityki społecznej / innowacji
  banned_topics text[] not null default '{}',           -- własna lista ROPS
  refusal_message text not null default
    'Tego tematu nie mogę poruszyć. Mogę pomóc znaleźć rozwiązania społeczne, informacje z materiałów ROPS albo połączyć Cię z pracownikiem Hubu.',
  -- funkcje
  images_enabled boolean not null default true,
  voice_enabled boolean not null default true,
  -- koszty
  monthly_budget_usd numeric(10, 2) not null default 100,
  alert_threshold_pct int not null default 80,
  hard_stop boolean not null default false,             -- po 100%: false = tryb oszczędny, true = zatrzymanie AI
  daily_requests_per_user int not null default 60,
  daily_images_per_user int not null default 5,
  daily_voice_minutes_per_user int not null default 15,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users on delete set null
);
insert into public.ai_policy (id) values (1) on conflict do nothing;

alter table public.ai_policy enable row level security;
create policy "admin read" on public.ai_policy for select using (public.is_admin());
create policy "admin update" on public.ai_policy for update using (public.is_admin()) with check (public.is_admin());

create table public.ai_moderation_events (
  id bigserial primary key,
  user_id uuid references auth.users on delete set null,
  route text not null,
  stage text not null check (stage in ('input', 'output')),
  reason text not null,               -- profanity | insult | moderation:<kategoria> | topic:<temat> | budget | rate_limit
  action text not null check (action in ('blocked', 'masked', 'redirected', 'degraded')),
  excerpt text,                       -- skrócony fragment (bez danych osobowych)
  created_at timestamptz not null default now()
);
alter table public.ai_moderation_events enable row level security;
create policy "admin read" on public.ai_moderation_events for select using (public.is_admin());
create index on public.ai_moderation_events (created_at desc);

alter table public.ai_usage add column session_key text;      -- anonimowe sesje demo / limity dzienne
create index on public.ai_usage (created_at);
create index on public.ai_usage (user_id, created_at);

-- Podsumowanie kosztów dla panelu
create or replace function public.ai_cost_summary(days int default 30)
returns table (day date, route text, requests bigint, cost_usd numeric)
language sql stable security definer set search_path = public as $$
  select created_at::date, route, count(*), sum(cost_usd)
  from public.ai_usage
  where public.is_admin() and created_at > now() - make_interval(days => days)
  group by 1, 2
  order by 1, 2;
$$;
