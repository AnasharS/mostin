-- Tester innowacji: ocena istniejących rozwiązań, informacja zwrotna i propozycje usprawnień (także bez logowania)
alter table public.reviews
  add column session_key text,
  add column relation text not null default 'opis' check (relation in ('test', 'korzystam', 'wdrazam', 'opis')),
  add column nickname text,
  add column status text not null default 'nowa' check (status in ('nowa', 'przekazana', 'zamknieta')),
  add column is_sample boolean not null default false;
create index on public.reviews (innovation_id, created_at desc);
