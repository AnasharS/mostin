-- Rozmowy z ROPS: wątki także dla anonimowych odwiedzających, triaż AI, szkic odpowiedzi dla pracownika

alter table public.threads
  add column session_key text,
  add column requester_label text,                     -- pseudonim / nazwa organizacji
  add column category text,                            -- triaż AI
  add column priority text not null default 'normal' check (priority in ('pilne', 'normal', 'niski')),
  add column ai_summary text,
  add column ai_draft text,                            -- szkic odpowiedzi dla pracownika ROPS (do edycji)
  add column assigned_to uuid references auth.users on delete set null,
  add column source text not null default 'form' check (source in ('form', 'mostek', 'innowacja', 'plan')),
  add column last_message_at timestamptz not null default now(),
  add column unread_by_rops boolean not null default true,
  add column unread_by_user boolean not null default false,
  add column first_response_at timestamptz;
alter table public.threads drop constraint if exists threads_kind_check;
alter table public.threads add constraint threads_kind_check check (kind in ('question', 'mentoring', 'partnership', 'handoff', 'idea', 'test'));
create index on public.threads (status, priority, last_message_at desc);
create index on public.threads (session_key);

alter table public.messages
  add column author_role text not null default 'user' check (author_role in ('user', 'rops', 'expert', 'system')),
  add column author_label text;

create table public.thread_contacts (
  thread_id bigint primary key references public.threads on delete cascade,
  email text,
  phone text
);
alter table public.thread_contacts enable row level security;
create policy "admin contacts" on public.thread_contacts for select using (public.is_admin());
