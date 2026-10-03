-- RLS + funkcje wyszukiwania

alter table public.areas enable row level security;
alter table public.regions enable row level security;
alter table public.profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.innovations enable row level security;
alter table public.materials enable row level security;
alter table public.needs enable row level security;
alter table public.matches enable row level security;
alter table public.ideas enable row level security;
alter table public.calls enable row level security;
alter table public.applications enable row level security;
alter table public.tests enable row level security;
alter table public.test_signups enable row level security;
alter table public.reviews enable row level security;
alter table public.threads enable row level security;
alter table public.thread_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.consultant_sessions enable row level security;
alter table public.ai_usage enable row level security;

-- Wiedza: publiczny odczyt, zapis tylko admin
create policy "public read" on public.areas for select using (true);
create policy "public read" on public.regions for select using (true);
create policy "public read" on public.challenges for select using (true);
create policy "public read" on public.innovations for select using (published or public.is_admin());
create policy "public read" on public.materials for select using (true);
create policy "public read" on public.calls for select using (true);
create policy "public read" on public.tests for select using (true);
create policy "public read" on public.reviews for select using (true);

create policy "admin write" on public.areas for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.regions for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.challenges for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.innovations for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.materials for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.calls for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.tests for all using (public.is_admin()) with check (public.is_admin());

-- Profile: każdy widzi nazwy (eksperci w katalogu), edytuje swój; rolę zmienia tylko admin
create policy "read profiles" on public.profiles for select using (true);
create policy "update own profile" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));
create policy "admin profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- Potrzeby: autor + eksperci/admin
create policy "own needs" on public.needs for select using (author_id = auth.uid() or public.is_expert_or_admin());
create policy "create needs" on public.needs for insert with check (author_id = auth.uid());
create policy "admin needs" on public.needs for update using (public.is_admin());

create policy "read matches" on public.matches for select using (
  public.is_expert_or_admin()
  or exists (select 1 from public.needs n where n.id = need_id and n.author_id = auth.uid())
);
create policy "feedback on own matches" on public.matches for update using (
  exists (select 1 from public.needs n where n.id = need_id and n.author_id = auth.uid())
);

-- Pomysły: zgłoszone widoczne publicznie (galeria), szkice tylko autor
create policy "read ideas" on public.ideas for select using (
  status not in ('draft', 'rejected') or author_id = auth.uid() or public.is_expert_or_admin()
);
create policy "create ideas" on public.ideas for insert with check (author_id = auth.uid());
create policy "update own ideas" on public.ideas for update using (author_id = auth.uid() or public.is_admin());

create policy "own applications" on public.applications for select using (author_id = auth.uid() or public.is_admin());
create policy "create applications" on public.applications for insert with check (author_id = auth.uid());
create policy "update own applications" on public.applications for update using (author_id = auth.uid());

-- Tester
create policy "own signups" on public.test_signups for select using (user_id = auth.uid() or public.is_admin());
create policy "sign up" on public.test_signups for insert with check (user_id = auth.uid());
create policy "cancel signup" on public.test_signups for delete using (user_id = auth.uid());
create policy "write review" on public.reviews for insert with check (user_id = auth.uid());

-- Komunikacja: członkowie wątku + admin
create or replace function public.is_thread_member(t bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.thread_members where thread_id = t and user_id = auth.uid());
$$;

create policy "read threads" on public.threads for select using (public.is_thread_member(id) or public.is_admin());
create policy "create threads" on public.threads for insert with check (created_by = auth.uid());
create policy "update threads" on public.threads for update using (public.is_thread_member(id) or public.is_admin());

create policy "read members" on public.thread_members for select using (public.is_thread_member(thread_id) or public.is_admin());
create policy "add members" on public.thread_members for insert with check (
  public.is_admin()
  or exists (select 1 from public.threads t where t.id = thread_id and t.created_by = auth.uid())
);

create policy "read messages" on public.messages for select using (public.is_thread_member(thread_id) or public.is_admin());
create policy "post messages" on public.messages for insert with check (
  author_id = auth.uid() and (public.is_thread_member(thread_id) or public.is_admin())
);

create policy "own notifications" on public.notifications for select using (user_id = auth.uid());
create policy "mark read" on public.notifications for update using (user_id = auth.uid());

create policy "own sessions" on public.consultant_sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admin usage" on public.ai_usage for select using (public.is_admin());

-- ───────────────────────── wyszukiwanie hybrydowe ─────────────────────────
-- score = 0.6·cosine + 0.25·FTS (znormalizowany) + 0.15·zgodność obszaru

create or replace function public.match_innovations(
  query_embedding extensions.vector(1536),
  query_text text,
  filter_area_id int default null,
  match_count int default 20
)
returns table (id bigint, title text, summary text, area_ids int[], target_groups text[], stage text,
               is_sample boolean, semantic real, lexical real, score real)
language sql stable set search_path = public, extensions as $$
  with q as (
    select websearch_to_tsquery('simple', extensions.unaccent('extensions.unaccent', lower(coalesce(query_text, '')))) as tsq
  ),
  scored as (
    select i.id, i.title, i.summary, i.area_ids, i.target_groups, i.stage, i.is_sample,
           (1 - (i.embedding <=> query_embedding))::real as semantic,
           ts_rank_cd(i.fts, q.tsq, 32)::real as lexical,
           (case when filter_area_id is not null and filter_area_id = any(i.area_ids) then 1 else 0 end)::real as area_hit
    from public.innovations i, q
    where i.published and i.embedding is not null
    order by i.embedding <=> query_embedding
    limit greatest(match_count * 3, 50)
  )
  select id, title, summary, area_ids, target_groups, stage, is_sample, semantic, lexical,
         (0.6 * semantic + 0.25 * lexical + 0.15 * area_hit)::real as score
  from scored
  order by score desc
  limit match_count;
$$;

create or replace function public.match_needs(
  query_embedding extensions.vector(1536),
  match_count int default 5,
  min_similarity real default 0.5
)
returns table (id bigint, summary text, area_id int, region_id int, status text, similarity real)
language sql stable security definer set search_path = public, extensions as $$
  -- security definer: zwraca tylko zanonimizowane streszczenia, bez autora i surowego tekstu
  select n.id, n.summary, n.area_id, n.region_id, n.status,
         (1 - (n.embedding <=> query_embedding))::real as similarity
  from public.needs n
  where n.embedding is not null and n.summary is not null
    and 1 - (n.embedding <=> query_embedding) >= min_similarity
  order by n.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function public.match_knowledge(
  query_embedding extensions.vector(1536),
  match_count int default 5
)
returns table (kind text, id bigint, title text, summary text, url text, similarity real)
language sql stable set search_path = public, extensions as $$
  (select 'challenge', c.id, c.title, c.summary, c.source_url, (1 - (c.embedding <=> query_embedding))::real
   from public.challenges c where c.embedding is not null
   order by c.embedding <=> query_embedding limit match_count)
  union all
  (select 'material', m.id, m.title, m.summary, m.url, (1 - (m.embedding <=> query_embedding))::real
   from public.materials m where m.embedding is not null
   order by m.embedding <=> query_embedding limit match_count)
  order by 6 desc
  limit match_count;
$$;

-- Trendy potrzeb (tylko admin - sprawdzane w funkcji)
create or replace function public.needs_trends(days int default 90)
returns table (area text, region text, week date, count bigint)
language sql stable security definer set search_path = public as $$
  select a.name, r.name, date_trunc('week', n.created_at)::date, count(*)
  from public.needs n
  left join public.areas a on a.id = n.area_id
  left join public.regions r on r.id = n.region_id
  where public.is_admin() and n.created_at > now() - make_interval(days => days)
  group by 1, 2, 3
  order by 3, 4 desc;
$$;

-- Realtime dla czatu i powiadomień
alter publication supabase_realtime add table public.messages, public.notifications;
