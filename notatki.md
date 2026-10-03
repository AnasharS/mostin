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

## 11a. Marka i paleta

- **Nazwa MostIn** (camel case): **Most** jest czarny, **In** pomarańczowy. „Most” łączy problem z rozwiązaniem, „In” to wejście do świata innowacji.
- **Paleta:** ciepły pomarańcz `#E85D2A` + krem `#F7F4EE` + prawie czerń `#181816`. Bez gradientów i prawie bez cieni, styl editorial/civic, który odcina się od typowego „purple gradient AI dashboard”.
- **Pomarańcz jest akcentem, nie tłem:** CTA, linki, linia mostu pod hasłem, paski dopasowania, fokus.
- **Mostek nie jest maskotką.** Oznacza go pomarańczowy węzeł ● jako punkt łączący elementy systemu.
- **Decyzja WCAG:** biały tekst na `#E85D2A` ma tylko 3.48:1, czyli poniżej AA. Przyciski dostały pomarańcz przyciemniony do `#C54415` (4.99:1 z białym), linki w tekście `#A83B18` (5.79:1). Czysty `#E85D2A` zostaje tam, gdzie obowiązuje próg 3:1 dla grafiki (znak, linie, paski, fokus 3.17:1). Obramowania pól mają `#8C877D` (3.26:1, WCAG 1.4.11).

## 13. Middleman Innowacji — „Dostosuj z Mostkiem”

- **Wejście:** przycisk na każdej karcie wyniku matchmakingu i na stronie innowacji. Opis problemu przechodzi z wyszukiwania, a typ i nazwa instytucji z persony.
- **Formularz zamiast czatu:** typ instytucji, miejscowość, odbiorcy, ludzie do dyspozycji, budżet (przedziały), czas, ograniczenia. Dlaczego formularz: szybszy, dostępny z klawiatury i czytnika, nie wymaga umiejętności „rozmawiania z AI” (seniorzy, urzędnicy). Mostek w czacie będzie drugą drogą do tej samej funkcji.
- **Wynik (structured output, Opus 5.5):**
  - tytuł planu i **ocena wykonalności 0–100** ze szczerym komentarzem;
  - tabela **„W oryginale / U Ciebie”**, czyli co i dlaczego zmienić;
  - etapy z rolami i czasem, budżet orientacyjny w PLN, partnerzy lokalni, ryzyka z zapobieganiem, wskaźniki sukcesu, **pierwszy tydzień**;
  - **założenia** przyjęte z braku danych do sprawdzenia przez użytkownika.
- **Ugruntowanie:** plan opiera się na opisie innowacji z Biblioteki ROPS i danych z formularza. Czego nie wiadomo (np. ceny gry), model oznacza jako założenie zamiast zgadywać. Formularz przechodzi przez ten sam guard co zapytania (wulgaryzmy, moderacja, dane osobowe, budżet).
- **Wydajność:** jeden plan na Opus trwał ~38 s, czyli powyżej limitu Netlify. Generujemy go jako **dwie równoległe części** z tymi samymi danymi wejściowymi (ocena, zmiany, etapy + budżet, partnerzy, ryzyka, wskaźniki, pierwszy tydzień), co daje ~25 s. Docelowo trasy AI idą do Supabase Edge Functions (limit liczony w minutach).
- **Wyjście:** „Drukuj / zapisz PDF” (style druku ukrywają nawigację), „Skonsultuj plan z ekspertem ROPS” (most do modułu komunikacji). Plan zapisuje się w `adaptation_plans`, więc ROPS widzi, jakie innowacje gminy chcą wdrażać, a to sygnał do upowszechniania.

## 14. Baza wiedzy ROPS (Knowledge RAG) — stan

- **Źródła wskazane przez ROPS:** Mapa Wyzwań Społecznych, Social Innovation Canvas (INNO AGH), raporty z badań, Obserwator Statystyk, publikacje.
- **W bazie:** 10 dokumentów (Mapa, Kanwa i 8 raportów z lat 2015–2026, w tym diagnoza usług społecznych, piecza zastępcza, DPS, mieszkania wspomagane, sektor opiekuńczy) → **~1600 fragmentów z numerami stron**. Koszt embeddingów ~1 cent.
- **Decyzja: nie kopiujemy PDF-ów do Storage.** Raporty mają po kilkanaście MB. Trzymamy link do źródła i fragmenty, a cytat prowadzi do oryginału ROPS. Brak duplikacji i zawsze aktualna wersja.
- **Synchronizacja dokumentów** (`pnpm ingest:docs`): hash SHA-256 pliku → bez zmian: pomiń | zmiana: ponowny chunking. Przebieg zapisuje się w `sync_runs`.
- **Filtr spisów treści:** fragmenty typu „Rozdział 3 ……… 27” zaśmiecały wyniki, więc pomijamy je przy dzieleniu na fragmenty.
- **Mapa Wyzwań → dane strukturalne:** 8 obszarów, 51 kluczowych wyzwań, 47 faktów ze źródłami (GUS, NIK…). Wyzwania trafiły do tabeli `challenges` z embeddingami i linkiem do konkretnej strony PDF (`#page=N`), a obszary do słownika `areas`. Ekstrakcja offline (agent w sesji), bez kosztu API. Dane źródłowe są w repo: `data/rops/mapa-wyzwan.json`.
- Mapa zawiera **dane ogólnopolskie** (zastrzeżenie z dokumentu), a raporty ROPS **małopolskie**. Mostek musi to rozróżniać przy cytowaniu.

## 15. Biblioteka innowacji (przegląd klasyczny)

- `/innowacje`: wszystkie 115 innowacji z filtrami: szukaj, obszar, dla kogo, etap. Filtry działają na tej samej taksonomii co matchmaking.
- Dlaczego osobno od matchmakingu: wymóg „wszystkie moduły dostępne klasycznie z UI”. Część użytkowników (urzędnicy JST) chce przeglądać katalog, a nie opisywać problem.

## 16. Osobowość Mostka — archetypy marki (tone of voice)

- **ROPS wybiera archetyp jednym kliknięciem** w Panelu → Ustawienia AI. Każda karta pokazuje przykładową wypowiedź.
  - **Opiekun** (domyślny): ciepły i cierpliwy, dla mieszkańców w trudnej sytuacji.
  - **Mędrzec:** rzeczowy, z danymi i źródłami, dla urzędników i JST.
  - **Towarzysz:** swojski i prosty, dla seniorów i osób o niskich kompetencjach cyfrowych.
  - **Przewodnik:** krok po kroku, dla osób zgłaszających pierwszy raz.
  - **Twórca:** inspiruje, łączy innowacje w nowe pomysły, dla Kreatora.
  - **Bohater:** mobilizuje do działania, dla organizacji gotowych wdrażać.
- **Dlaczego archetypy:** to język znany z brandingu, więc ROPS nie musi pisać promptów. Zmienia się tylko sposób mówienia, **a kaganiec merytoryczny (źródła, tematy, moderacja) jest zawsze nadrzędny**.
- **Do tego:** forma zwracania się (auto / Pan-Pani / Ty), długość odpowiedzi, prosty język domyślnie (plus preferencja użytkownika z paska dostępności), emoji wł./wył., dodatkowe wytyczne ROPS.
- **Implementacja:**
  - `lib/ai/persona.ts` zawiera definicje archetypów.
  - `tonePrompt()` buduje fragment promptu `<styl>` doklejany obok `<zasady_rops>` w każdej funkcji AI (uzasadnienia dopasowań, plany adaptacji, Mostek).
  - Zapis idzie przez sesję admina (RLS), a cache polityki jest unieważniany od razu.
- **Na tej samej stronie:** wszystkie przełączniki kagańca, limity kosztów i podgląd ostatnich zdarzeń moderacji.

## 17. Mostek — agent AI nad całą platformą

- **Nie jest dymkiem czatu w rogu, tylko warstwą nad serwisem:**
  - przycisk **● Zapytaj Mostka** w nagłówku każdej strony (panel boczny, skrót **Alt+M**);
  - pełny ekran `/mostek`;
  - wejście ze strony głównej.
  Mostek zna kontekst strony, na której jest użytkownik. Wszystkie moduły są też dostępne klasycznie.
- **Narzędzia** (Claude tool use, `strict`):
  - `search_innovations`: wyszukiwanie hybrydowe w Bibliotece;
  - `get_innovation`: szczegóły innowacji;
  - `search_documents`: RAG po raportach ROPS z numerami stron;
  - `search_challenges`: Mapa Wyzwań;
  - `propose_action`: przycisk następnego kroku (dostosuj / kreator / rozmowa z ROPS / dopasuj / otwórz sekcję).
- **Bezpieczeństwo działań:**
  - narzędzia tylko czytają bazę, a jedyne „działanie” to przycisk, który klika człowiek;
  - „dostosuj” wolno zaproponować tylko dla innowacji, którą Mostek faktycznie widział w wynikach narzędzi (walidacja ID).
- **Ugruntowanie:**
  - każda informacja ma cytat w formacie pola `zrodlo` z narzędzia (np. „[Piecza zastępcza w Małopolsce (2024), s. 70–71]”), wyświetlany jako znacznik źródła;
  - pod odpowiedzią jest lista **zacytowanych** źródeł z linkami do konkretnej strony PDF;
  - dane z Mapy Wyzwań są oznaczone jako ogólnopolskie, z raportów jako małopolskie;
  - test: na pytanie o liczbę samotnych seniorów Mostek odpowiedział, że materiały ROPS jej nie zawierają, i nie zgadywał.
- **Kaganiec:** każda wiadomość przechodzi przez guard (wulgaryzmy, moderacja, dane osobowe, budżet, limit dzienny). Prompt zawiera `<zasady_rops>` i `<styl>` (archetyp) z panelu ROPS, a wyjście jest dodatkowo filtrowane z wulgaryzmów.
- **Decyzje techniczne:**
  - **Historia rozmowy po stronie serwera, tylko z dopisywaniem** (`consultant_sessions`). Opus 5.5 odrzuca historię, z której wycięto wcześniejsze wywołania narzędzi lub bloki myślenia, więc klient wysyła tylko nową wiadomość, a serwer dokleja ją do pełnego zapisu. Dostęp do sesji wymaga klucza sesji z ciasteczka httpOnly.
  - **Pułapka Opus 5.5:** tekst pisany *między* wywołaniami narzędzi wraca jako ukryte bloki myślenia, a nie jako odpowiedź. Rozwiązanie w prompcie: najpierw wszystkie narzędzia (łącznie z `propose_action`), potem jedna końcowa odpowiedź.
  - **Strumieniowanie (SSE):** tekst pojawia się na bieżąco, a statusy narzędzi („Przeszukuję raporty ROPS…”) pokazują, co się dzieje.
  - **Równoległe narzędzia:** wszystkie wyniki trafiają w jednej wiadomości. Limit 6 kroków na odpowiedź. Prompt caching dla promptu systemowego i definicji narzędzi.
  - **Dostępność:** natywny `<dialog>` (fokus w środku, Esc zamyka). Odpowiedź jest ogłaszana czytnikowi ekranu raz, po zakończeniu, a nie fragment po fragmencie. Rola `log`, Enter wysyła, Shift+Enter dodaje nową linię, a preferencja „prosty język” z paska dostępności trafia do Mostka.

## 18. Strojenie trafności — scenariusz „mama dziecka ze spastycznością”

- **Test:** „mój syn ma spastyczność rąk, jest ograniczony ruchowo, nie stać mnie na rehabilitację — co mogę zrobić w domu?”. Oczekiwane: **Edki — kredki terapeutyczne** (dla dzieci ze spastycznością ręki). Na początku Mostek ich nie proponował.
- **Diagnoza i poprawki, krok po kroku:**
  1. **Brak odmiany w Postgresie.** „spastyczność” i „spastycznością” to dla niego różne słowa (Supabase nie ma polskiego słownika). **Prosty stemming prefiksowy** w zapytaniu FTS: rdzeń słowa + `:*` (`spastyczn:*`) oraz lista polskich słów pospolitych do pominięcia.
  2. **Przycięta leksyka.** Wynik słów kluczowych był ucinany do 1, więc wiele innowacji miało 1.0. Normalizacja względem najlepszego kandydata w puli.
  3. **Pula kandydatów z obu rankingów** (60 semantycznych + 30 leksykalnych), żeby trafienie po rzadkim słowie nie wypadało z puli.
  4. **Próba RRF** (fuzja po pozycji) wypadła gorzej przy długich opisach, bo ranking leksykalny zdominowały słowa pospolite. Świadomie wróciliśmy do średniej ważonej.
  5. **Mostek uogólniał zapytanie** („spastyczność rąk” → „rehabilitacja ruchowa”) i gubił kluczowe słowo. Narzędzie wyszukuje teraz **dwa razy równolegle**: po zapytaniu Mostka i po dosłownych słowach użytkownika.
  6. **Sygnał „nazywa problem użytkownika”.** Rdzenie znaczących słów użytkownika są wyszukiwane w opisach kandydatów i **ważone rzadkością (IDF w obrębie wyników)**, więc „spastyczność” w jednej innowacji waży więcej niż „rehabilitacja” w sześciu. Model dostaje to pole i instrukcję, by takie innowacje wymieniać jako pierwsze.
- **Efekt:** Edki są pierwszą propozycją z trafnym opisem. Scenariusze kontrolne (seniorzy → Senior CUDER, gmina z rodzinami z Ukrainy → Mój pomocny Virtual World) nadal działają.
- **Na pitch:** jakość dopasowania sprawdzaliśmy na realnych scenariuszach użytkowników i poprawialiśmy mierzalnie (pozycja oczekiwanej innowacji w rankingu: #8 → #1 w odpowiedzi Mostka).

## 19. Profil potrzeb → Testuj (lista oczekujących) + Przęsła

- **Jeden opcjonalny profil potrzeb zasila trzy funkcje:** listę oczekujących na testy, Przęsła i (docelowo) rekomendacje wydarzeń. Zawiera obszary (wspólna taksonomia), grupy, krótki opis sytuacji, dzielnicę lub gminę, pseudonim i **dwie osobne zgody** (powiadomienia o testach / widoczność w Przęsłach).
- **Prywatność z założenia:**
  - **dane kontaktowe są w osobnej tabeli `profile_contacts`, nigdy nie trafiają do modeli AI** i widzi je tylko ROPS;
  - Mostek proponuje zapis przyciskiem z gotowymi kategoriami, a kontakt człowiek wpisuje sam w formularzu;
  - opis sytuacji jest maskowany z danych osobowych i filtrowany z wulgaryzmów, zanim trafi do embeddingu;
  - do działania wystarczą obszary, bez diagnoz (zgodnie z wytycznymi: nie wymagamy informacji o niepełnosprawności).
- **Lista oczekujących:** ROPS w panelu zmienia status testu na „open”, a system dopasowuje profile ze zgodą (kategorie i grupy) i tworzy **zaproszenia** (`test_invitations`). Użytkownik widzi je jako powiadomienia na stronie Testuj („Chcę testować / Nie teraz”). Wysyłka maili lub SMS to kolejny krok (kolumna `preferred` jest już w bazie).
- **Przęsła** (przęsło łączy dwa brzegi mostu, stąd nazwa) to kręgi wsparcia osób w podobnej sytuacji:
  - **anonimowe liczby** („4 osoby w okolicy Nowa Huta, 5 w Małopolsce”) z funkcji `przesla_similar`, która nie zwraca tożsamości, liczy tylko zgody i porównuje kategorie oraz embedding;
  - rozmowy **pod pseudonimem**, każda wiadomość przez filtr wulgaryzmów, moderację i maskowanie danych osobowych;
  - **propozycja spotkania** na żywo, tylko gdy grupa chce;
  - zasady kręgu: bez oceniania i bez porad medycznych.
- **Mostek** ma narzędzie `przesla_stats` i akcje `lista_testow` / `przesla`. W scenariuszu mamy dziecka ze spastycznością z Nowej Huty mówi: „Nie jest Pani sama. W Nowej Hucie działa krąg »Rodzice dzieci ze spastycznością« (4 osoby)” i proponuje dołączenie.
- **Dane demo** (`pnpm seed:demo`) są **syntetyczne**: 10 profili, 3 testy (Edki do otwarcia w demo, Senior CUDER i Virtual World otwarte), 3 kręgi z rozmowami.
- **Scenariusz demo:** ROPS otwiera test Edek w panelu → rodziny z listy dostają zaproszenia → mama widzi powiadomienie.

## 12. Do opisania na koniec (w miarę postępu)

- [x] Mostek — agent z narzędziami (sekcja 17)
- [x] Middleman — „Dostosuj z Mostkiem” (sekcja 13)
- [x] Knowledge RAG w praktyce (sekcje 14 i 17)
- [ ] Kreator pomysłów + generator wniosków + wizualizacja
- [ ] **Wizualizacja pomysłu (obraz z opisu):** osoba z pomysłem, ale bez środków na projekt czy grafika, generuje obraz innowacji (np. przedmiotu, miejsca, usługi) z opisu w Kreatorze i może wysłać fiszkę z wizualizacją do ROPS do wglądu. Obniża próg wejścia dla oddolnych innowatorów. Koszt kontrolowany limitem obrazów na użytkownika i przełącznikiem w ustawieniach AI.
- [x] Tester innowacji + **lista oczekujących na testy** (sekcja 19): zapis przez checkboxy, czat lub głos z Mostkiem → kategorie problemu + kontakt. Kontakt wpisuje się w formularzu i nie trafia do LLM. Gdy ROPS oznaczy innowację jako „gotową do testów”, system dopasowuje listę (kategorie + embedding) i tworzy powiadomienia (demo bez wysyłki maili).
- [ ] Rozmowy z ROPS (Realtime, powiadomienia)
- [ ] Panel kosztów i ustawień AI (kaganiec + **tone of voice przez archetypy marki**)
- [ ] **Sterowanie głosem** (jeśli wystarczy czasu): „Powiedz Mostkowi”, push-to-talk → STT → Mostek z narzędziem `navigate`; komendy dostępności lokalnie bez LLM. Dla seniorów i osób z niepełnosprawnościami ruchowymi lub wzroku.
- [ ] Deploy i koszt utrzymania

## Trudne pytania jury — szkic odpowiedzi

- **„Czy AI nie zmyśla innowacji?”** Nie może. Wybiera wyłącznie spośród kandydatów z bazy, a serwer sprawdza każde ID. Każda karta ma link do źródła ROPS.
- **„Co jeśli ROPS zmieni treści na stronie?”** Synchronizacja z hashem wykrywa zmiany i przetwarza ponownie tylko je.
- **„Ile to kosztuje w utrzymaniu?”** Import całej biblioteki to ~$3 jednorazowo, a jedno dopasowanie to kilka centów. Budżet i limity ustawia ROPS w panelu, a po przekroczeniu włącza się tryb oszczędny.
- **„Czy można go zmusić do przeklinania lub tematów politycznych?”** Cztery warstwy obrony (filtr, moderacja, polityka w prompcie, walidacja wyjścia), przełączniki ROPS i dziennik zdarzeń.
- **„Dlaczego nie zwykły chatbot?”** Matchmaking działa na ustrukturyzowanej wiedzy, a Mostek jest agentem, który wykonuje akcje (zgłoszenie, fiszka, plan wdrożenia, przekazanie do ROPS), a nie tylko odpowiada.
- **„ROPS mówi o ~200 innowacjach, a w MOSTIN jest 115?”** Publiczna Biblioteka Innowacji ROPS (9 kategorii) zawiera dokładnie 115 opisanych innowacji i wszystkie są w MOSTIN. Liczba ~200 to dorobek wszystkich inkubatorów z 10 lat: na przykład Małopolski Inkubator Innowacji Społecznych (do 2019: 42 innowacje w teście, 39 zakończyło test) i Inkubator Włączenia Społecznego (60 pomysłów). Część z nich nie ma podstron w bibliotece, tylko opisy w publikacjach i raportach. Architektura jest na to gotowa: CMS, importer z `source_type` i ekstrakcja AI z PDF/CSV pozwalają dołączyć resztę bez zmian w kodzie.
