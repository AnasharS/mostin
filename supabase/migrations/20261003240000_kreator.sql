-- Kreator pomysłów: kanwa innowacji społecznej (ROPS / INNO AGH), ocena Mostka, wizualizacja, generator wniosków

alter table public.ideas
  add column session_key text,
  add column author_label text,
  add column canvas jsonb not null default '{}',        -- odpowiedzi z Social Innovation Canvas
  add column assessment jsonb,                           -- ocena Mostka: mocne strony, luki, podobne innowacje, sugestie
  add column visual_prompt text,
  add column thread_id bigint references public.threads on delete set null,
  add column updated_at timestamptz not null default now();
create index on public.ideas (session_key);

alter table public.applications
  add column session_key text,
  add column sources jsonb not null default '[]',
  add column updated_at timestamptz not null default now();

-- nabór Inkubatora Włączenia Społecznego 2.0 - struktura sekcji wg wzoru formularza aplikacyjnego (zał. nr 3)
insert into public.calls (title, description, rules, opens_at, closes_at, active, is_sample)
select 'Inkubator Włączenia Społecznego 2.0 - nabór pomysłów na innowacje społeczne',
  'Nabór pomysłów na innowacje społeczne w obszarze włączenia społecznego (FERS 2021-2027, Działanie 5.1). Granty na przygotowanie i przetestowanie innowacji.',
  '{
    "program": "FERS 2021-2027, Działanie 5.1: Innowacje społeczne",
    "okres_przygotowawczy_max_mies": 3,
    "okres_testowania_max_mies": 9,
    "fazy_testu": ["Faza I testu", "Faza II testu"],
    "wymogi": ["włączenie społeczne / przeciwdziałanie wykluczeniu", "zgodność z ideą deinstytucjonalizacji", "nie powiela innowacji już wdrożonych lub inkubowanych", "nie ma charakteru wdrożeniowego", "bez opłat od testujących"],
    "sekcje_wniosku": [
      {"nr": 1, "tytul": "Tytuł innowacji", "pomoc": "Krótki i kojarzący się z przedmiotem innowacji."},
      {"nr": 3, "tytul": "Opis innowacji", "pomoc": "Na czym polega? Charakter (produkt, aplikacja, model pracy, rozwiązanie technologiczne)? Jak realizuje cel: włączenie społeczne / przeciwdziałanie wykluczeniu? Jak wpisuje się w deinstytucjonalizację?"},
      {"nr": 4, "tytul": "Innowacyjność rozwiązania", "pomoc": "Czy podobne rozwiązania są stosowane w Polsce lub na świecie? Jaką nową wartość wnosi? Czym się wyróżnia?"},
      {"nr": 5, "tytul": "Diagnoza problemu", "pomoc": "Dane statystyczne obrazujące skalę problemu, podstawy diagnozy (raporty, badania), zgodność z tematem z Mapy Wyzwań Społecznych."},
      {"nr": 6, "tytul": "Opis odbiorców innowacji", "pomoc": "Do kogo skierowana? Co wyróżnia grupę, jakie ma potrzeby, dlaczego jest wykluczona lub zagrożona wykluczeniem?"},
      {"nr": 7, "tytul": "Zmiana jaką wprowadza innowacja", "pomoc": "Wpływ na problem, zmiana w życiu odbiorców, wpływ na włączenie społeczne, zapobieganie wykluczeniu."},
      {"nr": 8, "tytul": "Wizja przyszłości innowacji", "pomoc": "Potencjał skali, rozszerzenie na inne grupy i miejsca, łatwość stosowania i wdrażalność."},
      {"nr": 9, "tytul": "Plan działania i koszty", "pomoc": "Okres przygotowawczy (max 3 mies.) i okres testowania (max 9 mies., faza I i II): działanie, termin, koszt."},
      {"nr": 10, "tytul": "Wnioskowana kwota grantu", "pomoc": "Całościowa kwota zgodna z kosztami z planu działania."},
      {"nr": 11, "tytul": "Zespół projektowy i jego doświadczenie", "pomoc": "Kto odpowiada za zadania, doświadczenie w pracy z odbiorcami i we wdrażaniu innowacji."}
    ],
    "sekcje_poza_ai": ["2. Dane pomysłodawcy", "12. Oświadczenia"]
  }'::jsonb,
  '2026-10-01', '2026-11-30', true, false
where not exists (select 1 from public.calls where title like 'Inkubator Włączenia Społecznego 2.0%');
