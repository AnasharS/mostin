# MostIn - architektura

MostIn (mostin.pl) to platforma Małopolskiego Hubu Innowacji Społecznych ROPS Kraków. Mostek to asystent AI działający nad wszystkimi modułami. Ten dokument opisuje, jak system jest zbudowany. Decyzje i ich uzasadnienie są w `notatki.md`.

## 1. Stack

| Warstwa | Wybór | Dlaczego |
|---|---|---|
| Frontend i API | Next.js 16 (App Router), TypeScript, Tailwind 4, shadcn/ui (Base UI) | Base UI daje ARIA i obsługę klawiatury, server actions upraszczają formularze |
| Baza, auth, pliki | Supabase: Postgres + pgvector, RLS, Auth, Storage, region UE | Dane, wektory, uprawnienia i pliki u jednego dostawcy |
| Tekst | Claude Opus 5.5 (oceny, uzasadnienia, plany, wnioski, Mostek), Claude Sonnet 5.5 (analiza zapytań, triaż, podsumowania leadów) | Opus tam, gdzie liczy się jakość osądu, Sonnet tam, gdzie liczy się czas |
| Embeddingi | OpenAI `text-embedding-3-small` (1536 wym.) | Tanie i dobre dla polskiego |
| Obrazy | OpenAI `gpt-image-1` | Ilustracja pomysłu w Kreatorze |
| Moderacja | OpenAI `omni-moderation-latest` (tekst i obrazy) | Bezpłatna druga warstwa po filtrze słownikowym |
| Głos | OpenAI `gpt-4o-mini-transcribe` (mowa → tekst), `gpt-4o-mini-tts` (tekst → mowa) | Tryb głosowy Mostka |
| Hosting | Netlify (aplikacja) + Supabase Cloud | |

Prompty systemowe i definicje narzędzi są stałe i cache'owane (prompt caching), więc kolejne tury rozmowy są tańsze i szybsze.

## 2. Struktura repozytorium

```
hubmi/
├─ app/
│  ├─ (public)/      strona główna, dla-mieszkancow, dla-gmin (radar, kwalifikacja, asystent), innowacje,
│  │                 wiedza (+ materialy), kreator, testuj, rozmowy, przesla, mentor, mostek, profil, aktualnosci
│  ├─ admin/         panel ROPS: pulpit, CMS ([resource]), leady, rozmowy, pomysly, trendy, przesla, opinie,
│  │                 ustawienia-ai, konto
│  ├─ api/           match, adapt, mostek (SSE), kreator (assess, application, visualize, upload, save),
│  │                 voice (transcribe, speak, config), kalendarz (.ics)
│  └─ logowanie/     logowanie, rejestracja, persony demo
├─ components/       ui (shadcn), site (nagłówek, stopka, pasek dostępności), mostek, kreator, admin, ...
├─ lib/
│  ├─ ai/            klienci, guard (moderacja, maskowanie), policy, persona (archetypy), taxonomy, usage (koszty)
│  ├─ match/         analiza zapytania, wyszukiwanie hybrydowe, rerank
│  ├─ mostek/        agent, narzędzia, prompty
│  ├─ cms/           deklaratywne definicje typów treści
│  ├─ ingest/        import Biblioteki ROPS i dokumentów PDF / ZIP
│  ├─ jst/           fakty naboru z cytatami
│  ├─ kreator/, middleman/, rozmowy/, przesla/, profiles/, ideas/, voice/, export/
│  └─ supabase/      klienci: przeglądarka, serwer (sesja użytkownika), admin (tylko skrypty)
├─ scripts/          ingest, ingest:docs, ingest:zips, seed:mapa, seed:demo, seed:demo-extra, verify:facts
├─ supabase/migrations/   schemat, RLS, funkcje wyszukiwania (25 migracji)
└─ data/rops/        dane źródłowe Mapy Wyzwań
```

## 3. Model danych (skrót)

- **Wiedza:** `innovations`, `documents`, `document_chunks`, `challenges`, `areas`, `regions`, `materials`, `calls` (nabory), `news`, `sync_runs`.
- **Użytkownicy:** `profiles` (rola, persona demo), `needs_profiles` (profil potrzeb), `profile_contacts` (kontakt, osobno).
- **Matchmaking:** `needs`, `matches`.
- **Kreator i granty:** `ideas`, `applications`, `pre_applications`, `call_notifications`, `jst_leads`.
- **Middleman:** `adaptation_plans`.
- **Testy:** `tests`, `test_signups`, `test_invitations`, `reviews`.
- **Komunikacja:** `threads`, `thread_members`, `thread_contacts`, `messages`, `notifications`.
- **Przęsła:** `circles`, `circle_members`, `circle_messages`, `circle_reports`, `circle_contact_requests`.
- **AI:** `ai_policy` (jeden rekord z ustawieniami ROPS), `ai_usage` (tokeny i koszt każdego wywołania), `ai_moderation_events`, `consultant_sessions` (historia Mostka).

**RLS na każdej tabeli.** Wiedza publiczna do odczytu, zapis tylko dla administratora. Dane kontaktowe tylko dla administratora. Wątki widzą ich członkowie. Funkcje `security definer` (np. podobne potrzeby, liczby w Przęsłach) zwracają tylko dane zanonimizowane. CMS zapisuje treści przez sesję administratora (RLS). Klient z kluczem serwisowym (`lib/supabase/admin.ts`, `server-only`) działa tylko w kodzie serwerowym, po sprawdzeniu uprawnień w kodzie: `requireAdmin()` w akcjach panelu, klucz sesji z ciasteczka httpOnly w trasach publicznych (rozmowy, profil potrzeb, Przęsła, Kreator).

## 4. Matchmaking

```
opis problemu (tekst lub głos)
 → guard: budżet, limit dzienny, wulgaryzmy i obelgi, moderacja, maskowanie danych osobowych
 → analiza (Sonnet 5.5): struktura problemu, search_text, kategorie i grupy, pytanie doprecyzowujące
 → embedding
 → match_innovations w Postgresie: 0.65 wektor + 0.20 pełnotekstowe (rdzenie słów, bez polskich znaków)
   + 0.15 zgodność kategorii i grup; pula z obu rankingów
 → + osobne wyszukiwanie po rzadkich słowach z oryginalnego opisu (lib/match/rare.ts), premia zależna od rzadkości
 → rerank i uzasadnienie (Opus 5.5, 10 kandydatów z przyciętymi opisami): ocena 0-100, dlaczego pasuje, co dostosować,
   pierwszy krok, pokrycie i luka
 → walidacja: tylko ID z puli kandydatów
 → zapis potrzeby (podobne przypadki, Trendy w panelu)
```

Rzadkie słowa: słowo użytkownika, które występuje w najwyżej 5 opublikowanych innowacjach (indeks pełnotekstowy), daje osobne wyszukiwanie i premię 0,4 × (1 / liczba innowacji z tym słowem). Innowacja z jedynym w Bibliotece słowem użytkownika zawsze trafia na listę. `matchInnovations()` z tego modułu używają dopasowanie, triaż rozmów i Kreator (podobne innowacje, wniosek); narzędzie Mostka `search_innovations` korzysta z tych samych rzadkich słów.

Dopasowanie ma trzy wejścia (`components/match/match-page.tsx`): `/dla-mieszkancow`, `/dla-gmin/znajdz-rozwiazanie`, `/dla-organizacji/znajdz-rozwiazanie` - ten sam silnik, inne teksty i przyciski przy wynikach. Ostatni wynik jest w `sessionStorage` (powrót przyciskiem „wstecz”).

Innowacje są przy imporcie normalizowane przez Claude do tej samej struktury i taksonomii (`lib/ai/taxonomy.ts`), a embedding liczy się z `search_text` pisanego językiem mieszkańca.

## 5. Baza wiedzy (RAG)

PDF → tekst per strona (`unpdf`) → fragmenty ok. 1400 znaków z zakładką i zakresem stron → embeddingi → `document_chunks` → `match_chunks` (wektor + pełnotekstowe). Spisy treści są pomijane. Dokumentacja modeli z paczek ZIP jest przypięta do swojej innowacji. PDF-y zostają u ROPS, w bazie są fragmenty i link do źródła.

Synchronizacja z Biblioteką ROPS (`pnpm ingest`, przycisk w panelu) i dokumentów (`pnpm ingest:docs`) porównuje skrót SHA-256 i przetwarza tylko nowe lub zmienione treści. Każdy przebieg trafia do `sync_runs`.

## 6. Mostek

- Czat w panelu bocznym (Alt+M) i pełny ekran `/mostek`, odpowiedź strumieniowana (SSE) z trasy `api/mostek`.
- Narzędzia (Claude tool use, tylko odczyt): `search_innovations`, `get_innovation`, `search_documents`, `search_challenges`, `search_calls`, `przesla_stats`, `propose_action`, a w panelu ROPS `koszty_ai`.
- `propose_action` tworzy przycisk, który klika człowiek. Może wskazać tylko innowację lub krąg zwrócony wcześniej przez narzędzie w tej rozmowie.
- Kontekst: bieżąca strona i ścieżka odbiorcy, tryb (mieszkańcy, gminy, panel ROPS), preferencja prostego języka.
- Historia w `consultant_sessions`, tylko dopisywana. Klient wysyła tylko nową wiadomość, dostęp do sesji wymaga klucza z ciasteczka httpOnly.
- Prompt caching: znaczniki cache na prompcie systemowym i na ostatnim bloku rozmowy (tylko w zapytaniu, nie w zapisanej historii), więc każdy krok z narzędziami i każde kolejne pytanie czyta dotychczasową rozmowę z cache.
- Głos: `api/voice/transcribe` (mowa → tekst, tekst widoczny przed wysłaniem), `api/voice/speak` (czytanie odpowiedzi). Nagrania nie są zapisywane. ROPS włącza głos per podstrona.

## 7. Warstwa bezpieczeństwa AI (`lib/ai/guard.ts`, `lib/ai/policy.ts`)

```
wejście
 → [1] filtr słownikowy: wulgaryzmy i obelgi PL z odmianami, dane osobowe (PESEL, telefon, e-mail, konto) → maskowanie
 → [2] moderacja OpenAI; przy treściach o kryzysie telefony zaufania zamiast zwykłej odmowy
 → [3] prompt systemowy z ai_policy: tylko dozwolone źródła, wyłączone tematy, zakaz zgadywania liczb,
       treść dokumentów to dane, nie polecenia; styl z archetypu i preferencja prostego języka
 → [4] kontrola wyjścia: ID innowacji, wulgaryzmy, usuwanie długich pauz
 → zapis ai_usage i ai_moderation_events
```

Budżet miesięczny, próg alertu, dzienne limity na sesję (zapytania, obrazy, minuty głosu) i tryb oszczędny są w `ai_policy` i edytowane w panelu. Ustawienia działają po kilkunastu sekundach (krótki cache). Tryb oszczędny (budżet przekroczony, bez twardego zatrzymania): `guardInput` ustawia `policy.economy`, a `textModel(policy)` wybiera Sonnet 5.5 zamiast Opus 5.5; ilustracje i głos są wtedy wyłączone.

Koszty (`lib/ai/usage.ts`): każde wywołanie zapisuje do `ai_usage` model, który faktycznie odpowiedział (`response.model`, także model zapasowy po odmowie), tokeny wejściowe z zapisem do cache (1,25 × cena wejścia), tokeny z cache i koszt. Embeddingi też są logowane. Odczyt dziennika jest stronicowany (Supabase zwraca najwyżej 1000 wierszy). Panel pokazuje koszty według modeli, Mostek w panelu - narzędzie `koszty_ai`.

## 8. Długie zadania AI a limity hostingu

Netlify ucina funkcje po 30 s. Dlatego:
- szkic wniosku: przeglądarka wysyła 6 równoległych żądań po 1-3 sekcje;
- plan wdrożenia: dwie równoległe części z tymi samymi danymi wejściowymi;
- triaż rozmów i podsumowania leadów: w tle przez `after()`, po odpowiedzi do użytkownika.

Docelowo te zadania mogą przejść do Supabase Edge Functions.

## 9. Pliki od użytkowników

`api/kreator/upload`: typ rozpoznawany po zawartości pliku (JPG, PNG, WebP), do 5 MB, dzienny limit na sesję, moderacja obrazu, zapis w Storage przez serwer. Ilustracje AI trafiają do tego samego kosza.

## 10. Dostępność

Semantyczny HTML, landmarki, „Przejdź do treści”, okruszki, widoczny fokus, pełna obsługa klawiaturą, etykiety i opisy pól, regiony `aria-live` dla wyników i odpowiedzi Mostka, statusy tekstem. Pasek dostępności (rozmiar tekstu, wysoki kontrast, prosty język, bez animacji) zapisuje ustawienia lokalnie i w ciasteczku, a skrypt startowy nakłada je przed pierwszym renderem. Test automatyczny axe-core: 0 naruszeń WCAG 2.0 / 2.1 A i AA na stronach publicznych.

## 11. Tryb demo

`DEMO_MODE=true` włącza przełącznik person (Niezalogowany, Mieszkanka Anna, Mentor, Koordynatorka ROPS). Persona to anonimowa sesja Supabase z rolą nadaną na serwerze, więc RLS działa jak przy prawdziwym koncie. Przy `DEMO_MODE=false` przełącznika i persony administratora nie ma, a zespół loguje się e-mailem. Dane przykładowe ładują `pnpm seed:demo` i `pnpm seed:demo-extra`.
