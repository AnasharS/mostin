# MOSTIN — notatki techniczne do pitcha

> Dziennik decyzji: **co** zbudowaliśmy, **jak** działa i **dlaczego** tak. Uzupełniany na bieżąco w trakcie hackathonu.
> Na koniec: pełny opis każdej funkcji + odpowiedzi na trudne pytania jury.

---

## 1. Wybór zadania

- **Decyzja:** wyzwanie UMWM / ROPS Kraków (Małopolski Hub Innowacji Społecznych), praca solo.
- **Dlaczego:** punktacja nagradza liczbę działających modułów (+5% za każdy ponad obowiązkowy matchmaking), a mój stack (Next.js, Supabase, Claude) pozwala dowozić moduły szybko. ROPS deklaruje dalsze wdrożenie zwycięskiego prototypu.

## 2. Stack

| Warstwa | Wybór | Dlaczego |
|---|---|---|
| Frontend + API | Next.js 16 (App Router), TypeScript, Tailwind 4, shadcn/ui (Base UI) | Szybkie budowanie; Base UI daje ARIA i obsługę klawiatury → WCAG |
| Baza | Supabase: Postgres + pgvector + RLS + Auth + Storage + Realtime | Jeden dostawca dla danych, wektorów, uprawnień i plików; region UE |
| LLM tekst | Claude Opus 5.5 (ocena dopasowań, uzasadnienia, ingestion) + Claude Sonnet 5.5 (analiza zapytania) | Opus tam, gdzie liczy się jakość osądu; Sonnet na ścieżce krytycznej czasu odpowiedzi |
| Embeddingi | OpenAI `text-embedding-3-small` | Anthropic nie ma endpointu embeddingów; koszt ~$0.02 / 1M tokenów |
| Obrazy / głos | OpenAI Images, STT (`gpt-4o-mini-transcribe` ~$0.003/min), TTS | Wizualizacja pomysłów, sterowanie głosem dla seniorów |
| Hosting | Netlify (frontend) + Supabase (baza, docelowo Edge Functions dla długich zadań AI) | Netlify ucina funkcje strumieniujące po 10 s, a zwykłe po 30 s, więc długie zadania AI idą do Supabase |

## 3. Model danych i bezpieczeństwo

- **RLS na każdej tabeli.** Wiedza jest publiczna do odczytu, a zapisuje ją tylko admin. Potrzeby i pomysły widzi autor, ekspert i admin. Rozmowy widzą tylko członkowie wątku.
- **Funkcje `security definer`** (`is_admin`, `match_needs`) zwracają tylko zanonimizowane dane. Podobne przypadki innych osób są widoczne bez autora i bez surowego tekstu.
- **Panel ROPS zapisuje przez sesję admina, a nie kluczem serwisowym.** Uprawnienia egzekwuje baza, nie tylko interfejs.
- **Pliki** idą z przeglądarki prosto do Supabase Storage (polityka RLS: tylko admin). Omija to limity rozmiaru żądań Next i Netlify.
- **Brak prawdziwych danych osobowych** (wymóg regulaminu). Dane osobowe w zapytaniach są maskowane przed wysłaniem do AI.

## 4. Dwa mechanizmy AI — świadomie różne

### A. Innovation Matchmaker (ingestion, nie klasyczny RAG)
- **Jak:** każda innowacja przy imporcie przechodzi przez LLM, który zamienia luźny opis na strukturę: problem, rozwiązanie, potrzeby, kategorie, grupy docelowe, lokalizacja, etap, wymagania wdrożeniowe, zasoby, dla kogo. Do tego powstaje **`search_text`**: akapit pisany językiem, jakim mieszkaniec opisałby problem („babcia nie umie zadzwonić do wnuków przez wideo”). Embedding liczymy z `search_text`, a nie z surowego opisu.
- **Dlaczego:** matchmaking działa na lokalnej, uporządkowanej wiedzy, a nie próbuje za każdym razem zrozumieć strony ROPS. Jest szybciej, stabilniej i trafniej, bo zgłaszający i katalog mówią „tym samym językiem”.
- **Wspólna taksonomia** (`lib/ai/taxonomy.ts`): 18 kategorii i 16 grup docelowych. Innowacje i zapytania są klasyfikowane do tych samych wartości, więc filtry metadanych trafiają.

### B. Knowledge RAG (dokumenty)
- **Jak:** PDF → tekst per strona → fragmenty ~1400 znaków z zakładką i **zakresem stron** → embeddingi → `document_chunks`. Wyszukiwanie hybrydowe (wektor + pełnotekstowe), łączone metodą RRF.
- **Dlaczego:** dokument urzędowy trzeba cytować. Mostek odpowiada w stylu „Według raportu X… — źródło: Raport X, s. 27”.

## 5. Przepływ matchmakingu (obowiązkowy moduł)

```
opis problemu
 → guard (budżet, limit dzienny, wulgaryzmy/obelgi, moderacja OpenAI, maskowanie danych osobowych)
 → analiza LLM (Sonnet 5.5): struktura problemu + search_text + pytanie doprecyzowujące + on_topic
 → embedding
 → hybrydowe wyszukiwanie w Postgres: 0.65 wektor + 0.20 pełnotekstowe (OR słów) + 0.15 zgodność kategorii/grup → top 15
 → rerank i uzasadnienie (Opus 5.5): fit 0–100, „dlaczego pasuje”, „co dostosować”, „pierwszy krok”, ocena pokrycia i luki
 → walidacja: model nie może wskazać innowacji spoza kandydatów (sprawdzanie ID)
 → zapis potrzeby (zasila podobne przypadki i trendy w panelu ROPS)
```

- **Uczciwe wyniki:** model może pokazać 2 trafne zamiast 5 naciąganych. Pole `coverage` mówi, czy katalog pokrywa problem, a `gap` opisuje, czego brakuje. To jest most do **Kreatora pomysłów**: „nie ma rozwiązania → stwórz je”.
- **Przejrzystość:** pod każdym wynikiem „Jak liczymy dopasowanie?” pokazuje składowe (znaczenie, słowa kluczowe, kategorie). Zawsze jest też link do źródła ROPS.
- **Poprawka FTS:** `websearch_to_tsquery` wymagał wszystkich słów naraz, więc długie opisy dawały 0 trafień. Własna funkcja `or_tsquery` łączy słowa przez OR.
- **Polski w Postgresie:** Supabase nie ma polskiego słownika, więc FTS działa jako `simple` + `unaccent` (ignoruje polskie znaki, nie odmienia słów). Odmianę rekompensują embeddingi, które rozumieją znaczenie.
- **Wydajność:** analiza na Sonnet 5.5 skróciła czas z ~28 s do ~23 s. Prompty systemowe są cache'owane (prompt caching), co obniża koszt i opóźnienie przy powtarzających się zapytaniach.

## 6. Import i synchronizacja Biblioteki Innowacji ROPS

- **Rozpoznanie:** strona ROPS jest renderowana serwerowo. 115 innowacji w 9 kategoriach, bez paginacji, każda ma 6 stałych sekcji (rozwiązanie, problem, grupa docelowa, kto może skorzystać, czy to działa, autorzy) oraz film, PDF i paczkę ZIP. Brak robots.txt i zabezpieczeń anty-botowych. Licencja CC BY 4.0, więc źródło podajemy przy każdej innowacji.
- **Importer** (`pnpm ingest`, przycisk „Synchronizuj teraz” w panelu): pobranie → **hash SHA-256 treści merytorycznej** → bez zmian: pomiń | nowa/zmieniona: zapis + LLM + embedding. Każdy przebieg trafia do `sync_runs`.
- **Dlaczego hash:** ROPS nie musi niczego wpisywać ręcznie, a ponowna synchronizacja kosztuje tylko tyle, ile zmieniło się treści. Zmiany kosmetyczne strony nie uruchamiają LLM.
- **Docelowo:** Supabase Cron + Edge Function uruchamiane raz dziennie. Kolumny `source_type`, `source_hash`, `source_updated_at`, `last_synced_at` są już w bazie dla wszystkich typów treści.
- **Koszt importu:** cała biblioteka przez API kosztowałaby ~$3. Zrobiliśmy 69 rekordów przez API ($2.11), a 46 przez ekstrakcję offline z tym samym schematem walidacji (`pnpm apply-structured`).

## 7. „Kaganiec” AI — ROPS decyduje

- **Tabela `ai_policy`** z przełącznikami: blokuj wulgaryzmy / obelgi, maskuj dane osobowe, tylko dozwolone źródła, bez porad medycznych / prawnych / polityki / religii / tematów spoza polityki społecznej, własna lista zakazanych tematów, własny komunikat odmowy, obrazy i głos wł./wył.
- **Warstwy obrony:**
  1. Filtr deterministyczny (rdzenie wulgaryzmów PL i ich odmiany, obelgi, PESEL, telefon, e-mail, nr konta). Działa natychmiast i bez kosztu.
  2. OpenAI Moderation (bezpłatne). Przy treściach o samookaleczeniu pokazujemy telefony zaufania 116 123 / 116 111 / 112 zamiast zwykłej odmowy.
  3. Prompt systemowy budowany z polityki ROPS: odpowiedzi wyłącznie z narzędzi MOSTIN, brak źródła → „nie wiem, przekażę do ROPS”, a instrukcje w treści dokumentów nie zmieniają zasad (ochrona przed prompt injection).
  4. Walidacja wyjścia: ID innowacji muszą istnieć w wynikach, a wulgaryzmy w odpowiedzi są maskowane.
- **Dziennik `ai_moderation_events`:** ROPS widzi, co i dlaczego zostało zablokowane (bez danych osobowych).
- **Zmiana przełącznika działa po ~15 s** (krótki cache polityki), bez wdrożenia.

## 8. Kontrola kosztów

- Każde wywołanie AI zapisuje tokeny i koszt w `ai_usage` (cennik per model w `lib/ai/usage.ts`).
- W `ai_policy` ustawiamy miesięczny budżet, próg alertu (80%), twarde zatrzymanie lub tryb oszczędny po przekroczeniu budżetu oraz dzienne limity na użytkownika (zapytania, obrazy, minuty głosu).
- Anonimowi odwiedzający mają stabilny klucz sesji w ciasteczku, więc limity działają bez logowania.
- Panel „Koszty AI” (podział na funkcje, dzień, miesiąc, prognoza) jest do zrobienia.

## 9. Brak login walla — persony demo

- **Zasada hackathonu:** demo bez logowania.
- **Rozwiązanie:** publiczne moduły działają anonimowo, a ekran „Wejdź jako…” ma persony (mieszkanka, fundacja, gmina, ekspert, koordynatorka ROPS).
- **Pod spodem:** anonimowa sesja Supabase z rolą nadaną serwerowo. RLS działa jak przy prawdziwym koncie, a nikt nie wpisuje hasła.
- **Bezpieczeństwo:** persona admina jest dostępna tylko przy `DEMO_MODE=true`, na produkcji jest wyłączona. Logowanie e-mailem zostało jako opcja.

## 10. CMS (Panel ROPS)

- **Deklaratywny** (`lib/cms/resources.ts`): jedna definicja daje listę, wyszukiwarkę, formularz, walidację i zapis. Nowy typ treści to jeden obiekt w konfiguracji.
- **„Przetwórz AI”** przy innowacji lub dokumencie uruchamia ingestion. Pola uzupełnione przez AI są oznaczone i można je poprawić ręcznie, a zmiana treści oznacza rekord do ponownego przetworzenia.
- Pulpit pokazuje liczniki zgłoszeń, pomysłów, rozmów i kosztów AI oraz historię synchronizacji.

## 11. Dostępność (WCAG 2.1 AA) — od pierwszego ekranu

- **Kontrasty sprawdzone w tokenach motywu:** tekst 15.9:1, primary 10.6:1, tekst pomocniczy 7.0:1.
- **Krój Atkinson Hyperlegible Next**, zaprojektowany przez Braille Institute dla osób słabowidzących, z polskimi znakami.
- **Pasek dostępności na każdej stronie:** tekst 100/125/150%, wysoki kontrast (czarno-żółty), prosty język (przekazywany do AI), wyłączenie animacji. Ustawienia są zapamiętywane i nakładane przed pierwszym renderem, więc strona nie „mruga”.
- **Struktura i komunikaty:** skip-link, landmarki, widoczny fokus 3 px, etykiety i opisy pól, statusy zawsze tekstem (nie tylko kolorem), wyniki i postęp w regionach `aria-live`, a fokus po wyszukiwaniu przechodzi na nagłówek wyników.
- **Plan:** sterowanie głosem „Powiedz Mostkowi” (push-to-talk → STT → Mostek z narzędziem `navigate`; komendy dostępności obsługiwane lokalnie bez LLM).

## 12. Do opisania na koniec (w miarę postępu)

- [ ] Mostek — agent z narzędziami (warstwa konwersacyjna nad wszystkimi modułami)
- [ ] Middleman — „Dostosuj z Mostkiem”
- [ ] Knowledge RAG w praktyce (cytowanie stron)
- [ ] Kreator pomysłów + generator wniosków + wizualizacja
- [ ] Tester innowacji
- [ ] Rozmowy z ROPS (Realtime, powiadomienia)
- [ ] Panel kosztów i ustawień AI
- [ ] Sterowanie głosem
- [ ] Deploy i koszt utrzymania

## Trudne pytania jury — szkic odpowiedzi

- **„Czy AI nie zmyśla innowacji?”** Nie może. Wybiera wyłącznie spośród kandydatów z bazy, a serwer sprawdza każde ID. Każda karta ma link do źródła ROPS.
- **„Co jeśli ROPS zmieni treści na stronie?”** Synchronizacja z hashem wykrywa zmiany i przetwarza ponownie tylko je.
- **„Ile to kosztuje w utrzymaniu?”** Import całej biblioteki to ~$3 jednorazowo, a jedno dopasowanie to kilka centów. Budżet i limity ustawia ROPS w panelu, a po przekroczeniu włącza się tryb oszczędny.
- **„Czy można go zmusić do przeklinania lub tematów politycznych?”** Cztery warstwy obrony (filtr, moderacja, polityka w prompcie, walidacja wyjścia), przełączniki ROPS i dziennik zdarzeń.
- **„Dlaczego nie zwykły chatbot?”** Matchmaking działa na ustrukturyzowanej wiedzy, a Mostek jest agentem, który wykonuje akcje (zgłoszenie, fiszka, plan wdrożenia, przekazanie do ROPS), a nie tylko odpowiada.
