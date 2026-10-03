# MOSTIN - notatki techniczne do pitcha

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

## 4. Dwa mechanizmy AI - świadomie różne

### A. Innovation Matchmaker (ingestion, nie klasyczny RAG)
- **Jak:** każda innowacja przy imporcie przechodzi przez LLM, który zamienia luźny opis na strukturę: problem, rozwiązanie, potrzeby, kategorie, grupy docelowe, lokalizacja, etap, wymagania wdrożeniowe, zasoby, dla kogo. Do tego powstaje **`search_text`**: akapit pisany językiem, jakim mieszkaniec opisałby problem („babcia nie umie zadzwonić do wnuków przez wideo”). Embedding liczymy z `search_text`, a nie z surowego opisu.
- **Dlaczego:** matchmaking działa na lokalnej, uporządkowanej wiedzy, a nie próbuje za każdym razem zrozumieć strony ROPS. Jest szybciej, stabilniej i trafniej, bo zgłaszający i katalog mówią „tym samym językiem”.
- **Wspólna taksonomia** (`lib/ai/taxonomy.ts`): 18 kategorii i 16 grup docelowych. Innowacje i zapytania są klasyfikowane do tych samych wartości, więc filtry metadanych trafiają.

### B. Knowledge RAG (dokumenty)
- **Jak:** PDF → tekst per strona → fragmenty ~1400 znaków z zakładką i **zakresem stron** → embeddingi → `document_chunks`. Wyszukiwanie hybrydowe (wektor + pełnotekstowe), łączone metodą RRF.
- **Dlaczego:** dokument urzędowy trzeba cytować. Mostek odpowiada w stylu „Według raportu X… - źródło: Raport X, s. 27”.

## 5. Przepływ matchmakingu (obowiązkowy moduł)

```
opis problemu
 → guard (budżet, limit dzienny, wulgaryzmy/obelgi, moderacja OpenAI, maskowanie danych osobowych)
 → analiza LLM (Sonnet 5.5): struktura problemu + search_text + pytanie doprecyzowujące + on_topic
 → embedding
 → hybrydowe wyszukiwanie w Postgres: 0.65 wektor + 0.20 pełnotekstowe (OR słów) + 0.15 zgodność kategorii/grup → top 15
 → rerank i uzasadnienie (Opus 5.5): fit 0-100, „dlaczego pasuje”, „co dostosować”, „pierwszy krok”, ocena pokrycia i luki
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

## 7. „Kaganiec” AI - ROPS decyduje

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

## 9. Brak login walla - persony demo

- **Zasada hackathonu:** demo bez logowania.
- **Rozwiązanie:** publiczne moduły działają anonimowo, a ekran „Wejdź jako…” ma persony (mieszkanka, fundacja, gmina, ekspert, koordynatorka ROPS).
- **Pod spodem:** anonimowa sesja Supabase z rolą nadaną serwerowo. RLS działa jak przy prawdziwym koncie, a nikt nie wpisuje hasła.
- **Bezpieczeństwo:** persona admina jest dostępna tylko przy `DEMO_MODE=true`, na produkcji jest wyłączona. Logowanie e-mailem zostało jako opcja.

## 10. CMS (Panel ROPS)

- **Deklaratywny** (`lib/cms/resources.ts`): jedna definicja daje listę, wyszukiwarkę, formularz, walidację i zapis. Nowy typ treści to jeden obiekt w konfiguracji.
- **„Przetwórz AI”** przy innowacji lub dokumencie uruchamia ingestion. Pola uzupełnione przez AI są oznaczone i można je poprawić ręcznie, a zmiana treści oznacza rekord do ponownego przetworzenia.
- Pulpit pokazuje liczniki zgłoszeń, pomysłów, rozmów i kosztów AI oraz historię synchronizacji.

## 11. Dostępność (WCAG 2.1 AA) - od pierwszego ekranu

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

## 13. Middleman Innowacji - „Dostosuj z Mostkiem”

- **Wejście:** przycisk na każdej karcie wyniku matchmakingu i na stronie innowacji. Opis problemu przechodzi z wyszukiwania, a typ i nazwa instytucji z persony.
- **Formularz zamiast czatu:** typ instytucji, miejscowość, odbiorcy, ludzie do dyspozycji, budżet (przedziały), czas, ograniczenia. Dlaczego formularz: szybszy, dostępny z klawiatury i czytnika, nie wymaga umiejętności „rozmawiania z AI” (seniorzy, urzędnicy). Mostek w czacie będzie drugą drogą do tej samej funkcji.
- **Wynik (structured output, Opus 5.5):**
  - tytuł planu i **ocena wykonalności 0-100** ze szczerym komentarzem;
  - tabela **„W oryginale / U Ciebie”**, czyli co i dlaczego zmienić;
  - etapy z rolami i czasem, budżet orientacyjny w PLN, partnerzy lokalni, ryzyka z zapobieganiem, wskaźniki sukcesu, **pierwszy tydzień**;
  - **założenia** przyjęte z braku danych do sprawdzenia przez użytkownika.
- **Ugruntowanie:** plan opiera się na opisie innowacji z Biblioteki ROPS i danych z formularza. Czego nie wiadomo (np. ceny gry), model oznacza jako założenie zamiast zgadywać. Formularz przechodzi przez ten sam guard co zapytania (wulgaryzmy, moderacja, dane osobowe, budżet).
- **Wydajność:** jeden plan na Opus trwał ~38 s, czyli powyżej limitu Netlify. Generujemy go jako **dwie równoległe części** z tymi samymi danymi wejściowymi (ocena, zmiany, etapy + budżet, partnerzy, ryzyka, wskaźniki, pierwszy tydzień), co daje ~25 s. Docelowo trasy AI idą do Supabase Edge Functions (limit liczony w minutach).
- **Wyjście:** „Drukuj / zapisz PDF” (style druku ukrywają nawigację), „Skonsultuj plan z ekspertem ROPS” (most do modułu komunikacji). Plan zapisuje się w `adaptation_plans`, więc ROPS widzi, jakie innowacje gminy chcą wdrażać, a to sygnał do upowszechniania.

## 14. Baza wiedzy ROPS (Knowledge RAG) - stan

- **Źródła wskazane przez ROPS:** Mapa Wyzwań Społecznych, Social Innovation Canvas (INNO AGH), raporty z badań, Obserwator Statystyk, publikacje.
- **W bazie:** 10 dokumentów (Mapa, Kanwa i 8 raportów z lat 2015-2026, w tym diagnoza usług społecznych, piecza zastępcza, DPS, mieszkania wspomagane, sektor opiekuńczy) → **~1600 fragmentów z numerami stron**. Koszt embeddingów ~1 cent.
- **Decyzja: nie kopiujemy PDF-ów do Storage.** Raporty mają po kilkanaście MB. Trzymamy link do źródła i fragmenty, a cytat prowadzi do oryginału ROPS. Brak duplikacji i zawsze aktualna wersja.
- **Synchronizacja dokumentów** (`pnpm ingest:docs`): hash SHA-256 pliku → bez zmian: pomiń | zmiana: ponowny chunking. Przebieg zapisuje się w `sync_runs`.
- **Filtr spisów treści:** fragmenty typu „Rozdział 3 ……… 27” zaśmiecały wyniki, więc pomijamy je przy dzieleniu na fragmenty.
- **Mapa Wyzwań → dane strukturalne:** 8 obszarów, 51 kluczowych wyzwań, 47 faktów ze źródłami (GUS, NIK…). Wyzwania trafiły do tabeli `challenges` z embeddingami i linkiem do konkretnej strony PDF (`#page=N`), a obszary do słownika `areas`. Ekstrakcja offline (agent w sesji), bez kosztu API. Dane źródłowe są w repo: `data/rops/mapa-wyzwan.json`.
- Mapa zawiera **dane ogólnopolskie** (zastrzeżenie z dokumentu), a raporty ROPS **małopolskie**. Mostek musi to rozróżniać przy cytowaniu.

## 15. Biblioteka innowacji (przegląd klasyczny)

- `/innowacje`: wszystkie 115 innowacji z filtrami: szukaj, obszar, dla kogo, etap. Filtry działają na tej samej taksonomii co matchmaking.
- Dlaczego osobno od matchmakingu: wymóg „wszystkie moduły dostępne klasycznie z UI”. Część użytkowników (urzędnicy JST) chce przeglądać katalog, a nie opisywać problem.

## 16. Osobowość Mostka - archetypy marki (tone of voice)

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

## 17. Mostek - agent AI nad całą platformą

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
  - każda informacja ma cytat w formacie pola `zrodlo` z narzędzia (np. „[Piecza zastępcza w Małopolsce (2024), s. 70-71]”), wyświetlany jako znacznik źródła;
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

## 18. Strojenie trafności - scenariusz „mama dziecka ze spastycznością”

- **Test:** „mój syn ma spastyczność rąk, jest ograniczony ruchowo, nie stać mnie na rehabilitację - co mogę zrobić w domu?”. Oczekiwane: **Edki - kredki terapeutyczne** (dla dzieci ze spastycznością ręki). Na początku Mostek ich nie proponował.
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

## 20. Rozmowy z ROPS - szybkość komunikacji użytkownik ↔ administrator

- **Kryterium ROPS** brzmi: „jak system powiadamia administratora o nowym zgłoszeniu i jak wygląda ścieżka odpowiedzi do autora”.
- **Ścieżka użytkownika (bez konta):**
  1. Formularz „Napisz do ROPS” (pytanie / ekspert / partnerstwo / pomysł / testy) albo **przekazanie z Mostka z gotowym podsumowaniem sprawy**.
  2. **Natychmiastowe potwierdzenie** w rozmowie, z informacją o czasie odpowiedzi.
  3. Odpowiedź ROPS pojawia się w wątku (odświeżanie co kilka sekund), a lista rozmów oznacza nową odpowiedź kropką.
- **Ścieżka ROPS:**
  - nowa sprawa tworzy **powiadomienie dla każdego administratora** i licznik na pulpicie;
  - po wysłaniu odpowiedzi do użytkownika, **w tle (`after()` z Next.js)** rusza **triaż AI** (Sonnet 5.5, tani i szybki): kategoria, priorytet (pilne na górze skrzynki), 1-2-zdaniowe streszczenie i **szkic odpowiedzi** odwołujący się do pasujących innowacji z bazy;
  - pracownik edytuje szkic. Fragmenty, których AI nie wie, są oznaczone **[DO UZUPEŁNIENIA: …]**, a system **nie pozwoli wysłać odpowiedzi z niewypełnionym znacznikiem**. **Odpowiedź zawsze zatwierdza człowiek.**
  - można odpowiedzieć jako zespół ROPS albo jako ekspert, zmienić status i odświeżyć triaż;
  - **mierzymy średni czas pierwszej odpowiedzi** (`first_response_at`), widoczny w skrzynce.
- **Prywatność:** treść jest zapisywana z zamaskowanymi danymi osobowymi. Kontakt (opcjonalny) jest w osobnej tabeli i widzi go tylko ROPS. Wulgaryzmy są blokowane przy wysłaniu.
- **Dlaczego triaż w tle:** użytkownik nie czeka na AI (odpowiedź „wysłano” przychodzi od razu), a pracownik ROPS dostaje sprawę już uporządkowaną. To realne skrócenie czasu obsługi, a nie chatbot udający urzędnika.

## 21. Kreator pomysłów - od problemu do wniosku grantowego

- **Oparty na materiałach ROPS:** Social Innovation Canvas (ROPS / INNO AGH) i **prawdziwy wzór formularza aplikacyjnego naboru „Inkubator Włączenia Społecznego 2.0”** (zał. nr 3, FERS 2021-2027, Działanie 5.1).
- **5 kroków po kanwie z pytaniami pomocniczymi i opcjami do zaznaczenia** zamiast pustych pól, czyli przystępnie dla osób, które nigdy nie pisały wniosku:
  1. Problem (intensywność, częstotliwość, skala, odbiorcy).
  2. Rozwiązanie (typ, gotowość, zrozumiałość).
  3. Ludzie i wartość (kto wspiera / utrudnia, wartości emocjonalne i funkcjonalne, płatnik, decydent).
  4. Koszty stałe i zmienne.
  5. Ocena Mostka.
  - Wejście z matchmakingu przenosi opis problemu i „lukę”.
- **Ocena Mostka** (archetyp Twórcy, Opus 5.5):
  - **sprawdzenie unikalności względem 115 innowacji ROPS** (wyszukiwanie hybrydowe + werdykt „unikalny / częściowo podobny / powiela” z uzasadnieniem). Regulamin naboru wymaga, by innowacja **nie powielała już inkubowanych**, więc to sprawdzenie ma realną wartość;
  - mocne strony, luki z pytaniami pomocniczymi, nieoczywiste usprawnienia łączące pomysł z innowacjami z biblioteki (oznaczone jako propozycja), propozycja tytułu i następny krok.
  - Test: wypożyczalnia pomocy terapeutycznych w bibliotece → „częściowo podobny: korzysta z Edek, ale ich nie powiela; nowością jest model wypożyczalni + warsztaty”.
- **Wizualizacja pomysłu** (OpenAI `gpt-image-1`, 1024×1024, jakość low, **~$0.011 za obraz**):
  - ciepła ilustracja w palecie marki, bez tekstu i stygmatyzacji, zapisana w Supabase Storage;
  - przełącznik ROPS i **dzienny limit na osobę** (domyślnie 5), w trybie oszczędnym wyłączona;
  - dla osób bez środków na grafika czy projekt.
- **Fiszka → „Wyślij do ROPS”:** zapis pomysłu (`ideas`), wątek w Rozmowach z pełną kanwą i wizualizacją, powiadomienie administratorów i triaż AI. ROPS odpowiada w tej samej skrzynce.
- **Generator wniosku IWS 2.0:**
  - sekcje merytoryczne 1, 3-11 według wzoru formularza;
  - **sekcja 5 (diagnoza)** korzysta z RAG: fragmenty raportów ROPS z numerami stron i wyzwania z Mapy Wyzwań (z zaznaczeniem, że to dane ogólnopolskie);
  - **sekcja 4 (innowacyjność)** porównuje z konkretnymi innowacjami z biblioteki;
  - pilnuje wymogów naboru (okres przygotowawczy max 3 mies., testowanie max 9 mies. w fazie I i II, bez opłat od testujących);
  - kwot i zespołu nie zmyśla, tylko oznacza je **[DO UZUPEŁNIENIA]**;
  - **sekcje 2 (dane pomysłodawcy) i 12 (oświadczenia) świadomie poza AI** (dane osobowe i odpowiedzialność karna);
  - kopiowanie sekcji, druk / PDF, lista źródeł.
- **Wydajność:** cały wniosek w jednym wywołaniu trwał ~40 s, podział na 2-3 części po stronie serwera nadal ~38 s. Rozwiązanie: **przeglądarka wysyła 6 równoległych żądań po 1-3 sekcje** (każde < 25 s, mieści się w limicie hostingu), a sekcje pojawiają się w miarę gotowości. Szkic wniosku zapisuje się w `applications` (jeden na pomysł i nabór).

## 22. Strefa JST - asystent grantowy („Pani Marysia z gminy”)

- **Wskazanie ROPS:** głównym użytkownikiem będą JST. Ich problem: grant (np. **do 600 000 zł** na wdrożenie innowacji w naborze „Usługa Wrażliwa”, FEM 2021-2027, Działanie 6.23) oznacza dziesiątki stron regulaminu, ZIP-y z modelami i ryzyko, że po godzinie czytania okaże się, że czegoś brakuje (np. kadry).
- **Strona główna** ma jasny podział odbiorców: **gmina / OPS / powiat (główna ścieżka)**, mieszkaniec, organizacja, **pracownik ROPS (panel jednym kliknięciem, bez logowania)**. Do tego **powitanie Mostka** przy pierwszej wizycie („Hej! Powiedz mi, kim jesteś”) z tymi samymi ścieżkami. Powitanie nie przejmuje fokusu i nie blokuje strony.
- **`/dla-gmin`:**
  1. **Kontakt na starcie** (instytucja, e-mail / telefon, zgoda). Nawet jeśli gmina przerwie, przestraszona dokumentami, ROPS ma leada i może oddzwonić. Kontakt nie trafia do AI.
  2. **Mostek w trybie grantowym:** wyszukuje tylko w dokumentach naboru (regulamin 103 s., opisy tur I i II, instrukcje), zadaje maks. 3 pytania naraz (problem / innowacja, odbiorcy, zasoby), porównuje wymagania z zasobami, przy brakach proponuje rozwiązania zgodne z dokumentami (partnerstwo z NGO, łączenie zadań, finansowanie personelu z grantu, jeśli regulamin pozwala) i kończy blokami „Co już macie / Czego brakuje i jak uzupełnić / 3 następne kroki”. Ton ma zachęcać, a nie przerażać.
  3. **Panel ROPS → Leady gmin:** kontakt, **podsumowanie rozmowy, gotowość, bariery, zainteresowanie i „następny krok dla ROPS”**, aktualizowane przez AI (Sonnet 5.5) w tle po każdej odpowiedzi, plus ostatnie pytania gminy i statusy (kontakt ROPS / wniosek / zamknięty).
- **Nie zgadujemy liczb (zasada projektu, zapisana w CLAUDE.md):**
  - Test na liczbach wykazał, że kwotę 600 000 zł Mostek podał poprawnie, ale **przeoczył „Wkład własny nie jest wymagany”** (regulamin s. 25), bo wyszukiwanie nie wyłowiło tego fragmentu.
  - Rozwiązanie: **`lib/jst/facts.ts`** zawiera 9 kluczowych faktów naboru z **dosłownym cytatem i numerem strony** (kwota, brak wkładu własnego, 18 / 12 miesięcy, kto może aplikować, jedna innowacja na kategorię, plan wdrożenia z ROPS, wsparcie ekspertów, punktacja, termin i forma). **`pnpm verify:facts` automatycznie sprawdza, że każdy cytat występuje w dokumencie ROPS.**
  - Mostek dostaje te fakty jako potwierdzone. Wszystko poza nimi i poza fragmentami z wyszukiwania jest „niepotwierdzone”, więc nie zgaduje progów kadrowych, kosztów ani terminów, tylko kieruje pytanie do ROPS.
  - Retest: kwota, brak wkładu, 18 i 12 miesięcy są poprawne, z cytatami. O minimalnej kadrze: „nie znalazłem wymogu, nie mogę tego wykluczyć, potwierdźmy w ROPS”.

## 23. Pomysły wg kategorii i powiadomienia o naborach

- Mostek przy ocenie pomysłu w Kreatorze **przypisuje 1-3 kategorie** (wspólna taksonomia), które zapisują się z fiszką.
- **Panel ROPS → Pomysły wg kategorii:** wykres liczby pomysłów per obszar (kliknięcie filtruje), sortowanie, status, miniatura wizualizacji, link do rozmowy z autorem. Odpowiada na potrzebę „w przypadku grantu wiedzieć, do kogo uderzyć”.
- **Ogłoszenie naboru:** zapis aktywnego naboru z obszarami (Treści → Nabory grantowe) **automatycznie powiadamia autorów pomysłów z pasujących kategorii** wiadomością w ich rozmowie z ROPS („ROPS ogłosił nabór X, który pasuje do Twojego pomysłu Y - przygotuj wniosek w Kreatorze”). Każdy autor dostaje jedno powiadomienie na nabór (`call_notifications`).
- Demo: 7 syntetycznych pomysłów i nieaktywny „[DEMO] Nabór 2027: przeciwdziałanie samotności seniorów”. Aktywacja w panelu wysyła powiadomienia do autorów pomysłów z obszarów seniorzy / samotność.

## 24. Typografia i ikony

- **Zasada: żadnych długich pauz ani półpauz** w całym projekcie (UI, prompty, dane, dokumentacja). Zawsze zwykły łącznik „-”.
  - Kod i treści zostały zamienione masowo (85 plików).
  - Modele AI mają zakaz w prompcie, a każde ich wyjście przechodzi przez `noDashes()` (strumień Mostka i structured outputs).
  - Dane już zapisane w bazie oczyściła migracja.
  - Reguła jest w CLAUDE.md z poleceniem kontrolnym.
- **Ikony:** jednokolorowe SVG (lucide-react) zamiast emoji. Dziedziczą kolor tekstu, więc działają też w trybie wysokiego kontrastu, i są spójne z editorialowym stylem marki.

## 25. Tryb głosowy - „Powiedz to Mostkowi”

- **Dla kogo:** mieszkańcy, szczególnie osoby niewidome, słabowidzące, seniorzy i osoby z trudnościami w pisaniu. **Domyślnie włączony** na stronach mieszkańców (strona główna, Mostek, biblioteka, Testuj, Przęsła, Rozmowy), **wyłączony** w Strefie JST, Kreatorze i panelu ROPS (optymalizacja kosztów, zgodnie ze wskazaniem).
- **Jak działa:**
  - mikrofon w czacie Mostka: kliknij, mów (maks. 60 s), kliknij ponownie;
  - **mowa → tekst:** OpenAI `gpt-4o-mini-transcribe` (język polski, ~$0.003/min). **Rozpoznany tekst trafia do pola wiadomości** i jest widoczny i edytowalny przed wysłaniem (czytnik ekranu ogłasza „Rozpoznano: …, naciśnij Enter”);
  - **tekst → mowa:** `gpt-4o-mini-tts` (~$0.015/min), przycisk „Odsłuchaj” przy każdej odpowiedzi, opcjonalnie automatyczne czytanie; znaczniki źródeł i formatowanie są pomijane przy czytaniu.
  - Test w obie strony: synteza zdania „Mój syn ma spastyczność rąk…” i jego rozpoznanie wróciły **słowo w słowo**.
- **Panel ROPS → Ustawienia AI → Tryb głosowy:**
  - **przełącznik dla każdej podstrony**;
  - **wybór głosu** (13 głosów) z **odsłuchem próbki przed zapisaniem**;
  - **instrukcja sposobu mówienia** (domyślnie: ciepło, wyraźnie, w tempie dla osoby starszej lub słabowidzącej);
  - automatyczne czytanie wł./wył.;
  - **licznik kosztów w bieżącym miesiącu** (minuty rozpoznawania, minuty czytania, kwota) z przykładem skali (1000 rozmów × 2 min mówienia + 3 min odsłuchu ≈ $51/mies.).
- **Kontrola kosztów:** globalny przełącznik, przełączniki podstron, **dzienny limit minut głosu na osobę** (wspólny licznik w `ai_usage`, `units` = minuty), tryb oszczędny po przekroczeniu budżetu.
- **Prywatność:** nagranie nie jest zapisywane, przechodzi tylko przez rozpoznawanie. Dalej obowiązuje ten sam guard co przy pisaniu (wulgaryzmy, moderacja, dane osobowe).

## 26. Dokumentacja modeli innowacji (paczki ZIP ROPS) w RAG

- **Co jest w paczkach:** instrukcje, specyfikacje i modele pracy (PDF i DOCX, często w obu formatach), czasem kod źródłowy aplikacji.
- **Pipeline** (`pnpm ingest:zips`, `--all` dla całej biblioteki):
  - pobranie paczki i rozpakowanie w pamięci (`fflate`);
  - **PDF ma pierwszeństwo, DOCX tylko bez odpowiednika PDF** (`mammoth`); pomijamy kod, grafiki, wideo i zagnieżdżone ZIP-y;
  - tekst z numerami stron, fragmenty, embeddingi;
  - **każdy dokument przypięty do swojej innowacji** (`documents.innovation_id`);
  - hash każdego pliku, więc ponowna synchronizacja przetwarza tylko zmiany;
  - skany bez tekstu są oznaczane jako błąd (do OCR).
- **Dlaczego RAG, a nie normalizacja:** gmina potrzebuje **dokładnych zapisów z modelu z cytatem i stroną** (kadra, sprzęt, czas, sposób działania), a nie streszczenia.
- **Dlaczego przypięcie do innowacji:** Mostek ma w `search_documents` parametr `innovation_id` i szuka **w dokumentacji tej jednej innowacji**, bez mieszania modeli. Strona innowacji pokazuje listę „Dokumentacja modelu (przeszukiwalna przez Mostka)”.
- **Kolejność:** najpierw **10 innowacji z dwóch tur naboru „Usługa Wrażliwa”** (wykrywane automatycznie z treści stron tur). Ich dokumenty mają prefiks `uw:zip:`, więc **asystent grantowy widzi je razem z regulaminem** („ile osób potrzeba do Terapeuty przestrzeni?”). Reszta biblioteki to `--all` w tle.
- **Koszt:** embeddingi grosze. Pobieranie jest jednorazowe (1-2 GB dla całej biblioteki). Plików nie przechowujemy, link prowadzi do paczki ROPS (CC BY 4.0).

## 27. Radar naborów, test kwalifikacji, przedwstępny wniosek, aktualności

- **Cel:** zaskoczyć pomysłowością, która jest użyteczna. Zamiast „pogody na portalu”: **„Do 600 000 zł, bez wkładu własnego, zostało 12 dni. Sprawdź w 60 sekund, czy się kwalifikujecie”**.
- **Radar naborów** (Strefa JST, Aktualności):
  - aktywne nabory dla gmin z **odliczaniem dni**, kwotą i informacją o braku wkładu, **każda liczba ze źródłem** (regulamin, s. 6 i s. 25);
  - przycisk **„Dodaj termin do kalendarza”**: plik .ics z przypomnieniem 7 dni i 1 dzień przed końcem naboru. Drobiazg, który urzędnik naprawdę doceni.
- **Test kwalifikacji (4 pytania tak / nie):** każde pytanie zbudowane **wyłącznie ze zweryfikowanych faktów regulaminu** (`lib/jst/eligibility.ts` → `lib/jst/facts.ts`, sprawdzane przez `pnpm verify:facts`) i podpisane cytatem strony. Przy „nie” zamiast odmowy jest konkretna podpowiedź (np. partnerstwo z organizacją przy wymogu 12 miesięcy usługi). Na końcu zastrzeżenie: „wstępna orientacja, nie decyzja - ocenia ROPS”.
- **Przedwstępny wniosek:** instytucja, innowacja z listy naboru (10 z tur I i II), odbiorcy, zespół, partnerzy, potrzeba i wyniki testu. **Trafia do ROPS (Panel → Leady gmin → Przedwstępne wnioski)** z oznaczeniem, które warunki są do wyjaśnienia. Kontakt jest zbierany, nawet jeśli gmina nie przejdzie dalej.
- **Aktualności:** moduł CMS (rodzaj: nabór / wyniki / wydarzenie / innowacja / informacja; odbiorcy: wszyscy / JST / organizacje / mieszkańcy; przypinanie). Strona `/aktualnosci`, widżet na stronie głównej i sekcja „Najnowsze dla samorządów” w Strefie JST.
- **Uczciwość danych:**
  - prawdziwego terminu kolejnego naboru nie ma w dokumentach ROPS (tura II jest rozstrzygnięta), więc **termin w demo jest wyraźnie oznaczony jako przykładowy**;
  - aktualności o wynikach tur I i II mają **prawdziwe źródła** (strony ROPS), a wpisy demonstracyjne mają etykietę „dane przykładowe”;
  - przy okazji wykryłem i usunąłem własne niepotwierdzone daty naboru IWS 2.0 (wcześniej wpisane bez źródła).

## 28. Nowy system wizualny i architektura menu („civic”, nie „AI look”)

- **Problem:** pierwszy interfejs miał wszystkie znamiona generowanego UI: zaokrąglone karty w siatce, ikona w każdej karcie, kolorowe pigułki, „pudełka w pudełkach”, wiele równorzędnych przycisków.
- **Kierunek** (inspiracja projektem v7 właściciela, nie kopia 1:1), styl serwisów publicznych (GOV.UK, gov.pl), który budzi zaufanie urzędników:
  - **zero zaokrągleń, bez cieni** (tokeny `--radius: 0`, globalna reguła);
  - **linie i listy numerowane 01 / 02 / 03 zamiast kart z ikonami**;
  - **jedno główne działanie** na ekranie, duży nagłówek, krótkie wprowadzenie;
  - **przyciski: pomarańcz marki `#E85D2A` z ciemnym tekstem `#181816` (5.11:1, AA)**, wzorem v7 (ciemny tekst zamiast białego rozwiązał problem kontrastu pomarańczu);
  - aktywna zakładka oznaczona pomarańczową linią u dołu;
  - krój Atkinson Hyperlegible zostaje (czytelność dla osób słabowidzących).
- **Nowa architektura menu** (`lib/site/nav.ts`), zamiast 9 równorzędnych pozycji:
  1. **Pasek narzędzi:** dostępność oraz „Wejdź jako… / Panel ROPS”.
  2. **Zakładki odbiorców:** **Dla gmin i instytucji** (domyślna, wskazanie ROPS) · Dla organizacji i innowatorów · Dla mieszkańców · Baza wiedzy, obok przycisk „Zapytaj Mostka”.
  3. **Pasek modułów wybranej grupy**, np. dla gmin: Radar naborów · Asystent grantowy · Innowacje do wdrożenia · Sprawdź kwalifikację · Kontakt z ROPS.
  - Na stronie głównej nawigacją są **zakładki hero** (wzorzec ARIA tabs, strzałki zmieniają zakładkę), więc menu się nie dubluje. Każda zakładka ma własny nagłówek, jedno główne działanie i trzy numerowane wejścia.
- **Nowe strony:** `/dla-mieszkancow` (dopasowanie, Przęsła, Testuj, Mostek) i **`/wiedza` - Baza wiedzy**: liczniki (115 innowacji, 51 wyzwań, 280+ dokumentów, ~7500 fragmentów), Mapa Wyzwań z rozwijanymi obszarami i linkami do stron PDF, lista raportów. Wcześniej link „Wiedza” prowadził do 404.

## 12. Do opisania na koniec (w miarę postępu)

- [x] Mostek - agent z narzędziami (sekcja 17)
- [x] Middleman - „Dostosuj z Mostkiem” (sekcja 13)
- [x] Knowledge RAG w praktyce (sekcje 14 i 17)
- [x] Kreator pomysłów + generator wniosków + wizualizacja (sekcja 21)
- [x] **Wizualizacja pomysłu (obraz z opisu):** osoba z pomysłem, ale bez środków na projekt czy grafika, generuje obraz innowacji (np. przedmiotu, miejsca, usługi) z opisu w Kreatorze i może wysłać fiszkę z wizualizacją do ROPS do wglądu. Obniża próg wejścia dla oddolnych innowatorów. Koszt kontrolowany limitem obrazów na użytkownika i przełącznikiem w ustawieniach AI.
- [x] Tester innowacji + **lista oczekujących na testy** (sekcja 19): zapis przez checkboxy, czat lub głos z Mostkiem → kategorie problemu + kontakt. Kontakt wpisuje się w formularzu i nie trafia do LLM. Gdy ROPS oznaczy innowację jako „gotową do testów”, system dopasowuje listę (kategorie + embedding) i tworzy powiadomienia (demo bez wysyłki maili).
- [x] Rozmowy z ROPS (sekcja 20)
- [ ] Panel kosztów i ustawień AI (kaganiec + **tone of voice przez archetypy marki**)
- [x] **Tryb głosowy** (sekcja 25). Pierwotny plan: (jeśli wystarczy czasu): „Powiedz Mostkowi”, push-to-talk → STT → Mostek z narzędziem `navigate`; komendy dostępności lokalnie bez LLM. Dla seniorów i osób z niepełnosprawnościami ruchowymi lub wzroku.
- [ ] Deploy i koszt utrzymania

## Trudne pytania jury - szkic odpowiedzi

- **„Czy AI nie zmyśla innowacji?”** Nie może. Wybiera wyłącznie spośród kandydatów z bazy, a serwer sprawdza każde ID. Każda karta ma link do źródła ROPS.
- **„Co jeśli ROPS zmieni treści na stronie?”** Synchronizacja z hashem wykrywa zmiany i przetwarza ponownie tylko je.
- **„Ile to kosztuje w utrzymaniu?”** Import całej biblioteki to ~$3 jednorazowo, a jedno dopasowanie to kilka centów. Budżet i limity ustawia ROPS w panelu, a po przekroczeniu włącza się tryb oszczędny.
- **„Czy można go zmusić do przeklinania lub tematów politycznych?”** Cztery warstwy obrony (filtr, moderacja, polityka w prompcie, walidacja wyjścia), przełączniki ROPS i dziennik zdarzeń.
- **„Dlaczego nie zwykły chatbot?”** Matchmaking działa na ustrukturyzowanej wiedzy, a Mostek jest agentem, który wykonuje akcje (zgłoszenie, fiszka, plan wdrożenia, przekazanie do ROPS), a nie tylko odpowiada.
- **„ROPS mówi o ~200 innowacjach, a w MOSTIN jest 115?”** Publiczna Biblioteka Innowacji ROPS (9 kategorii) zawiera dokładnie 115 opisanych innowacji i wszystkie są w MOSTIN. Liczba ~200 to dorobek wszystkich inkubatorów z 10 lat: na przykład Małopolski Inkubator Innowacji Społecznych (do 2019: 42 innowacje w teście, 39 zakończyło test) i Inkubator Włączenia Społecznego (60 pomysłów). Część z nich nie ma podstron w bibliotece, tylko opisy w publikacjach i raportach. Architektura jest na to gotowa: CMS, importer z `source_type` i ekstrakcja AI z PDF/CSV pozwalają dołączyć resztę bez zmian w kodzie.

### 28a. Listy z liniami zamiast kart (wszystkie ekrany)
- Listy elementów (innowacje, testy, kręgi, leady, pomysły, rozmowy, aktualności, persony): linia nad listą + linia pod każdym wierszem, bez tła i ramek. Biblioteka innowacji: wiersz z opisem po lewej i kategoriami po prawej, wygodny do skanowania wzrokiem.
- Formularze i panele: gruba linia u góry zamiast ramki.
- Rzeczy ważne (radar naborów, start dla gminy, profil testera, luka w ofercie): pomarańczowa linia po lewej.
- Siatki kafelków (pulpit ROPS, archetypy Mostka, funkcje dla gmin): wspólne linie siatki, jak w tabeli urzędowej.
- Ramki zostały tylko tam, gdzie oznaczają element interaktywny: pola formularzy, okno czatu Mostka, powitanie.
- Dlaczego: karty z zaokrągleniami i cieniami to typowy wygląd szablonów generowanych przez AI. Linie to język druków i serwisów publicznych (gov.uk, biznes.gov.pl), czytelniejszy przy powiększeniu tekstu (WCAG 1.4.4, 1.4.10).

### 28b. Podpis autora w stopce
- Jedna linia w stopce: „Projekt i realizacja: Maciej Senderowski · HackYeah 2026”. Dyskretnie, bez logo i linków sprzedażowych - serwis ma wyglądać jak usługa ROPS. Do sprawdzenia: regulamin HackYeah (anonimowość zgłoszeń).

### 28c. Favicon i nagłówek hero
- Favicon: sygnet z logo (sam łuk mostu) jako `app/icon.svg`; ikona iOS generowana z tego samego wektora (`app/apple-icon.tsx`, next/og).
- Hero: wróciliśmy do dwóch wierszy z pierwszej wersji - pierwszy pomarańczowy (pytanie), drugi z odręczną, nieregularną kreską (odpowiedź). Jeden ludzki akcent przełamuje urzędową siatkę linii. Kreska jest tłem z `box-decoration-break: clone`, więc przy zawijaniu podkreśla każdą linijkę; w trybie wymuszonych kolorów zamienia się na zwykłe podkreślenie.

### 29. Mostek na każdej stronie, także w panelu ROPS
- Publicznie: przycisk „Zapytaj Mostka” w nagłówku; po przewinięciu w rogu pojawia się pływający „Mostek” (nie zasłania powitania na stronie głównej). Alt+M działa wszędzie.
- Panel ROPS: pływający „Zapytaj Mostka” na każdej stronie panelu, tryb `rops` (sprawdzany po stronie serwera rolą admin): krótkie, rzeczowe odpowiedzi jak od współpracownika, wskazywanie stron panelu (leady, rozmowy, nabory, budżet AI), bez proponowania Przęseł czy Kreatora.
- Szybkie przejścia bez AI: mapa serwisu (`lib/site/sitemap.ts`, słowa kluczowe z polską odmianą) dopasowywana w przeglądarce. Pod polem czatu „Przejdź od razu: …” już podczas pisania, a nad odpowiedzią „Od razu możesz przejść: …” zanim AI skończy. Zero kosztu, zero opóźnienia - AI dopowiada kontekst i źródła.
- Ta sama mapa trafia do promptu Mostka: przycisk „otworz” może wskazać każdą stronę (strony panelu tylko w trybie ROPS - walidacja w narzędziu). Pytania nawigacyjne: 1-2 zdania + przycisk, bez wyszukiwania.
- Kliknięcie linku w odpowiedzi zamyka panel, rozmowa zostaje w sesji.

### 30. Kolejność odbiorców, przyciski, lżejszy Kreator
- Zakładki: Dla mieszkańców → Dla gmin → Dla organizacji. Strona zaczyna od otwartości na każdego; urzędnik i tak kliknie swoją zakładkę. Strona główna podświetla ścieżkę mieszkańców.
- Przyciski: ciemniejszy pomarańcz #c2410c z białym tekstem (5.18:1, AA). Czarny tekst na jasnym pomarańczu był słabo czytelny w praktyce, mimo spełnionego progu. Hover przyciemnia (#a83b18), zamiast rozjaśniać.
- Kreator: na start widać tylko „problem” i „gdzie”, potem „pomysł” i nazwę. Skala, częstotliwość, odbiorcy, rodzaj i gotowość są zwinięte jako opcjonalne. Po kroku 2 od razu „Poproś Mostka o ocenę” - kroki „Ludzie i wartość” i „Koszty” dla chętnych.
- Wniosek przestał być celem ścieżki organizacji. Hasło: „Masz pomysł na innowację? Sprawdźmy go i rozwińmy razem.” Główne działanie po ocenie: fiszka do ROPS (pomysł dojrzewa w inkubatorze, zanim trafi do wniosku). Szkic wniosku zostaje jako podgląd („Zobacz, jak wyglądałby szkic wniosku”) i jako krok po ogłoszeniu naboru - zapisane pomysły dostają powiadomienie.

### 31. Mostek jako czat w rogu, przyklejone menu, Dostępność na telefonie
- Nowa osoba nie wie, kim jest Mostek, więc nie ma go w nagłówku. Na każdej stronie w prawym dolnym rogu jest okrągła ikona czatu (dymek) z podpisem „Masz pytanie? Zapytaj asystenta Mostka”. Po kliknięciu rozwija się okno: na komputerze w rogu, na telefonie na cały ekran. Mostek dalej pojawia się jako pomocnik w treści (asystent grantowy, dopasowanie).
- Telefon: okno czatu dopasowuje się do klawiatury ekranowej (visualViewport na iOS, `interactive-widget=resizes-content` na Androidzie), więc pole wpisywania nie chowa się pod klawiaturą.
- Nagłówek z menu jest przyklejony na komputerze i telefonie; na telefonie niższy (mniejsze logo, moduły w jednym przewijanym wierszu), kotwice mają `scroll-padding-top`.
- Telefon: wyraźny przycisk „Dostępność” przy logu rozwija pełny panel (wielkość tekstu, kontrast, prosty język, bez animacji). Na komputerze panel jest zawsze widoczny nad logo.

### 32. Fiszka pomysłu a wniosek - rozdzielone zgodnie z zadaniem ROPS
- Slajd „Kreator pomysłów” w prezentacji ROPS ma trzy punkty: zgłaszanie pomysłów i prowadzenie przez kreowanie innowacji, prezentacja dobrych praktyk, **„funkcja generatora wniosków w trakcie naborów”**.
- Na stronie Kreatora trzy jasno nazwane ścieżki:
  1. **Fiszka pomysłu** - zawsze otwarta: problem + pomysł, ocena Mostka (czy podobne już istnieje = dobre praktyki z Biblioteki), wysyłka do ROPS.
  2. **Wniosek do naboru pomysłów** - tylko gdy trwa nabór z formularzem (dziś: IWS 2.0, 10 sekcji wg wzoru formularza aplikacyjnego). Szkic powstaje z fiszki, z oznaczeniem „trwa nabór”. Bez naboru: zapis fiszki i powiadomienie, gdy nabór ruszy.
  3. **Grant na wdrożenie gotowej innowacji** - osobny nabór (Usługa Wrażliwa) dla gmin i organizacji, w Strefie JST z testem kwalifikacji i przedwstępnym wnioskiem.

### 33. Wyniki dopasowania i oznaczenie elementów demo
- Wynik dopasowania nie jest już ścianą tekstu. Po lewej duży numer z pomarańczowym ukośnikiem („1/”, „2/”) i stopień dopasowania w procentach z opisem („Bardzo dobre dopasowanie”) oraz paskiem. Pierwszy wynik ma etykietę „Najlepsze dopasowanie”.
- Treść ma hierarchię: tytuł → krótki opis → wyróżnione „Dlaczego pasuje do Twojej sytuacji” (większy tekst, pomarańczowa linia) → dwie kolumny „Co dostosować” / „Pierwszy krok” → przyciski.
- Wszystkie przykłady do kliknięcia (opisy sytuacji w dopasowaniu, pytania startowe Mostka, asystenta grantowego i panelu ROPS) są w jednej ramce z przerywaną linią, etykietą „DEMO” i dopiskiem, że to dane na potrzeby prezentacji, których w docelowej wersji nie będzie (`components/site/demo-examples.tsx`). Jury od razu odróżnia element pokazu od usługi.

### 34. Przęsła: anonimowość domyślnie, bliskość z wyboru
- „Moderacja” brzmiała jak nadzór, a krąg wsparcia musi pozwalać się wygadać. Rozdzieliliśmy to na cztery rzeczy:
  1. **Treść jest wolna.** Przekleństwa z frustracji przechodzą. Blokujemy tylko obrażanie innych osób z kręgu („ty debilu”, „jesteś idiotą”) oraz groźby i nienawiść (kategorie threatening/hate w moderacji OpenAI). Samookaleczenie celowo nie blokuje wiadomości.
  2. **Dane kontaktowe w grupie są ukrywane** (telefon, e-mail, PESEL, konto) - ochrona przed podaniem za dużo w kryzysie i przed oszustami. Po ukryciu system podpowiada „Poproś o kontakt”.
  3. **Kontakt prywatny po obopólnej zgodzie:** „Poproś o kontakt” przy pseudonimie, prośba z własnym kontaktem; adresat widzi go dopiero, gdy się zgodzi i poda swój. Kontakty widzą tylko te dwie osoby (`circle_contact_requests`).
  4. **ROPS nie czyta rozmów.** Wiadomości widzą tylko członkowie kręgu. ROPS widzi wyłącznie wiadomości zgłoszone przyciskiem „Zgłoś” (Panel → Zgłoszenia z Przęseł) i może je ukryć albo uznać zgłoszenie za bezzasadne.
- **Kryzys:** treść o myślach samobójczych (słowa kluczowe + kategoria self-harm) nie jest blokowana - pod wiadomością pojawia się ramka z telefonami 116 123, 800 70 2222, 116 111 i 112. Numery zweryfikowane na gov.pl (Ministerstwo Zdrowia).

### 35. Głos w czacie Mostka: naprawy
- **Rozpoznawanie mowy nie działało na iPhonie/Safari:** przeglądarka nagrywa w mp4, a plik był wysyłany jako „nagranie.webm” - API odrzucało go po rozszerzeniu (odtworzone testem: ten sam plik jako .m4a rozpoznany poprawnie, jako .webm błąd). Teraz format nagrania jest wybierany z obsługiwanych przez przeglądarkę, a nazwa pliku pasuje do formatu. Zbyt krótkie nagranie dostaje czytelny komunikat.
- **Rozpoznany tekst od razu trafia do Mostka** (widać go w rozmowie jako pytanie) - wcześniej lądował w polu i czekał na Enter, co wyglądało, jakby Mostek nie usłyszał.
- **Odtwarzanie:** jeden odtwarzacz na stronę. Nowa odpowiedź zatrzymuje poprzednią, kliknięcie w trakcie przygotowywania przerywa pobieranie, nowe pytanie, mikrofon, „Nowa rozmowa” i zamknięcie czatu zatrzymują czytanie. Odpowiedzi nie nakładają się na siebie.

### 36. Przęsła w demo: persona w kręgu i szybkie dołączanie
- Persona „Anna, mieszkanka Nowego Targu” (opiekuje się mamą po udarze) przy wejściu dostaje profil z pseudonimem Anna_NowyTarg i miejsce w nowym kręgu „Opiekunowie bliskich po udarze - Małopolska” (syntetyczne osoby i rozmowa, `lib/demo/circles.ts`, także w `pnpm seed:demo`). Jury od razu widzi rozmowę, „Zgłoś” i „Poproś o kontakt”.
- „Dołącz do kręgu” bez profilu nie odsyła już do Testuj z błędem. Prowadzi do krótkiego kroku `/przesla/dolacz`: pseudonim + zgoda i od razu wejście do kręgu. Obok ramka DEMO „Dołącz jako przykładowa osoba” - wylosowany pseudonim i jedno kliknięcie.

### 37. Dane demo do pokazu i panel po polsku
- Kręgi Przęseł mają dłuższe przykładowe rozmowy (wszystkie 4). Widać w nich zasady: ukryty numer i podpowiedź „Poproś o kontakt”, rozmowę o zmęczeniu bez oceniania, umawianie spotkania (`EXTRA_MESSAGES` w `lib/demo/circles.ts`, także w `pnpm seed:demo`).
- `pnpm seed:demo-extra` (idempotentne, session_key `demo-extra`) uzupełnia panel ROPS:
  - 5 leadów gmin z historią pytań do asystenta grantowego (różna gotowość i statusy),
  - 3 przedwstępne wnioski (jeden komplet, dwa z warunkami do wyjaśnienia),
  - 3 pytania gmin w Rozmowach z ROPS (jedno pilne, jedno z odpowiedzią),
  - zgłoszenia z Przęseł: reklama suplementu zgłoszona przez dwie osoby i jedno zgłoszenie z nieporozumienia,
  - 4 aktualności i 3 zdarzenia w dzienniku moderacji (fragmenty zamaskowane).
- Zgłoszenia tej samej wiadomości są grupowane (liczba zgłoszeń + lista powodów).
- CMS po polsku: rodzaje dokumentów i materiałów (Raport, Regulamin, Mapa wyzwań, Poradnik, Zasady naboru, Model innowacji, Kurs…) w formularzach i na listach; statusy i etapy też przez słownik etykiet.

### 38. Domknięcie wymagań: trendy, Tester, „co wiemy o problemie”, nabory w Mostku
- **Trendy potrzeb (tylko ROPS, `/admin/trendy`):** zgłoszenia z wyszukiwarki rozwiązań i profili potrzeb agregowane po obszarach i tygodniach (8 tygodni). Mapa tygodniowa z liczbami (nie tylko kolor), zmiana 4 tygodnie do 4 poprzednich, kogo dotyczą, skąd są zgłoszenia, ostatnie anonimowe streszczenia. **Popyt a podaż:** obok liczby zgłoszeń liczba innowacji w Bibliotece; „Sygnały dla Hubu” wskazują najwyżej 3 obszary, gdzie potrzeb przybywa, a rozwiązań jest mało - kandydaci na nabór lub inkubację. Matchmaking zapisuje teraz kategorie, grupy i miejsce potrzeby.
- **Tester - ocena i informacja zwrotna:** na stronie każdej innowacji ocena 1-5, „skąd znasz rozwiązanie” (test w MostIn / korzystam / wdrażam / z opisu), co działa, propozycja usprawnienia. Dane osobowe maskowane, wulgaryzmy odrzucane. Panel ROPS: „Opinie z testów” - średnie per innowacja i lista propozycji usprawnień do przekazania autorom.
- **„Co wiemy o tym problemie” w wyszukiwarce rozwiązań:** bez dodatkowego wywołania AI, równolegle z wyszukiwaniem: liczba podobnych zgłoszeń w MostIn ze wspólnym obszarem i 2 anonimowe streszczenia, 2 fakty z Mapy Wyzwań dobrane po zgodności słów z opisem (ze stroną i oznaczeniem „dane ogólnopolskie”), fragment raportu ROPS ze stroną (tylko raporty, nie dokumentacja modeli; oczyszczony z dzielenia wyrazów i nagłówków).
- **Mostek a dofinansowania:** nowe narzędzie `search_calls` - Radar naborów (kwota, termin, dla kogo, test kwalifikacji) + zweryfikowane warunki regulaminu z cytatem strony. Wcześniej zwykły czat nie widział naborów i uczciwie odmawiał podania kwot; teraz odpowiada konkretnie (do 600 000 zł, bez wkładu własnego, 18 miesięcy) i oznacza termin przykładowy jako przykładowy.
