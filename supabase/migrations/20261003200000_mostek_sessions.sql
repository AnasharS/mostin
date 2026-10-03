-- Sesje Mostka: pełna historia wiadomości API (append-only), także dla anonimowych odwiedzających
alter table public.consultant_sessions
  add column session_key text,
  add column title text,
  add column turns int not null default 0;
create index on public.consultant_sessions (session_key, updated_at desc);
-- odczyt/zapis wyłącznie przez serwer (klucz sesji w ciasteczku httpOnly); polityka "own sessions" zostaje dla zalogowanych
