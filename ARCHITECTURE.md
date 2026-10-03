# MOSTIN - architektura (HackYeah 2026, wyzwanie UMWM / ROPS Kraków)

> Nazwa produktu: **MOSTIN** (mostin.pl), asystent AI: **Mostek** - „most" między problemem, innowacją, wiedzą i instytucjami; „cyfrowe serce" Małopolskiego Hubu Innowacji Społecznych.
> Deadline: **4.10.2026, 11:00**. Solo. Ten dokument to kontrakt na 24h - co poza nim, to „roadmapa" na slajd.

## 1. Cel i punktacja → decyzje

| Kryterium | Waga | Co z tego wynika |
|---|---|---|
| Stopień spełnienia wyzwania | 40% (matchmaking 10% + 5% za każdy moduł) | Wszystkie 7 modułów w wersji „cienkiej, ale działającej" > 3 dopieszczone |
| Potencjał wdrożeniowy | 20% | Supabase + Netlify, koszt utrzymania policzony, import danych skryptem, API-first |
| Dostępność i intuicyjność (WCAG 2.1 AA) | 20% | Tryb „prosty język", duży tekst, wysoki kontrast, pełna klawiatura, głos zamiast pisania |
| Atrakcyjność / pomysłowość UI | 10% | Mostek AI jako główny interfejs + wizualizacje innowacji |
| Jakość materiałów i MVP | 10% | PDF 10 slajdów, demo link, film 3 min, makiety = zrzuty z działającej apki |

## 2. Moduły (nazwy robocze → wymaganie ROPS)

| # | Moduł w MOSTIN | Wymaganie | Priorytet |
|---|---|---|---|
| I | **Dopasuj** - matchmaking problem → podobne przypadki + innowacje | Matchmaking społeczny (obowiązkowy) | P0 |
| II | **Wiedza** - mapa wyzwań Małopolski, Biblioteka Innowacji, materiały edukacyjne; trendy potrzeb (tylko admin) | Zasobnik wiedzy | P0 |
| III | **Kreator** - fiszka pomysłu, generator wniosku pod konkretny nabór, asystent AI + wizualizacja | Kreator pomysłów | P1 |
| IV | **Testuj** - zapis na testy, oceny, feedback, propozycje usprawnień | Tester innowacji | P1 |
| V | **Rozmowy** - wątki użytkownik ↔ ROPS ↔ ekspert, powiadomienia | Platforma aktywnej komunikacji | P1 |
| VI | **Panel ROPS** - moderacja, edycja wiedzy, import danych, kolejka zgłoszeń, trendy | Panel administratora | P0 |
| VII | **Wdrożeniowiec** - AI dostosowuje innowację do formy usługi dla konkretnej JST/instytucji | Middleman Innowacji | P2 |
| ★ | **Mostek** - agent AI spinający wszystkie moduły (patrz §5) | wyróżnik „nowa jakość" | P0 |

## 3. Stack

| Warstwa | Wybór | Dlaczego |
|---|---|---|
| Frontend + lekkie API | **Next.js 16 (App Router), TypeScript, Tailwind, shadcn/ui (Base UI)** na **Netlify** | Base UI daje ARIA i obsługę klawiatury za darmo → WCAG |
| Trasy AI (długie / streaming) | **Supabase Edge Functions** (Deno, `npm:@anthropic-ai/sdk`, `npm:openai`) | Netlify ucina funkcje strumieniujące po 10 s - agent z narzędziami się nie zmieści; Edge Functions mają limit rzędu minut |
| Baza / auth / storage | **Supabase**: Postgres + **pgvector** + RLS + Auth (magic link) + Storage + Realtime | Jeden dostawca, RLS na role, Realtime do czatu i powiadomień |
| LLM tekst | **Anthropic** `claude-opus-5-5` (`@anthropic-ai/sdk`, streaming, tool runner, prompt caching) | Mostek, matchmaking-uzasadnienia, wnioski, Wdrożeniowiec |
| LLM obrazy | **OpenAI Images API** (model w env `OPENAI_IMAGE_MODEL`) | Wizualizacja pomysłu / „innowacyjnego przedmiotu" |
| Embeddingi | **OpenAI** `text-embedding-3-small` (1536 wym.) | Anthropic nie ma endpointu embeddingów; tanio |
| Mowa → tekst | **OpenAI `gpt-4o-mini-transcribe`** (push-to-talk, ~$0.003/min); fallback: Web Speech API | Dobra jakość polskiego, działa we wszystkich przeglądarkach |
| Tekst → mowa | **OpenAI TTS** (model w env) - odczyt odpowiedzi Mosteka; fallback: `speechSynthesis` | Seniorzy, słabowidzący, wykluczenie cyfrowe |
| Hosting | **Netlify** (frontend) + **Supabase Cloud, region EU** (baza, auth, storage, Edge Functions AI) | Dostępne konta, RODO-friendly region |

Effort per trasa (Opus 5.5 ma domyślnie `medium`, ustawiamy jawnie):
- Mostek (agent z narzędziami): `medium`
- Uzasadnienia dopasowań, tagowanie zgłoszeń, streszczenia: `low`
- Generator wniosku, Wdrożeniowiec: `high`

Wszystkie prompty systemowe + definicje narzędzi stałe → `cache_control` → tani i szybki multi-turn.

## 4. Matchmaking - przepływ (serce oceny „trafność dopasowania")

```
Użytkownik opisuje problem (tekst / głos)
        │
        ▼
[1] Normalizacja (Claude, effort low, structured output)
    → { streszczenie, obszar (seniorzy / zdrowie psych. / samotność / wykluczenie cyfrowe / ...),
        grupa_docelowa, gmina/powiat, słowa_kluczowe[] }
        │
        ▼
[2] Wyszukiwanie hybrydowe w Postgres (jedna funkcja RPC `match_innovations`)
    score = 0.6 · cosine(embedding) + 0.25 · ts_rank(FTS polski) + 0.15 · zgodność obszaru/grupy
    → top 20 innowacji  +  top 5 podobnych zgłoszeń  +  powiązane wyzwania z mapy
        │
        ▼
[3] Re-ranking + uzasadnienie (Claude, structured output)
    → top 5: { innowacja_id, dlaczego_pasuje, co_trzeba_dostosować, pewność: wysoka/średnia/niska }
        │
        ▼
[4] UI: karty z cytatem źródła, poziomem pewności, akcjami:
    „Zapytaj eksperta" · „Dostosuj do mojej gminy" (→ Wdrożeniowiec) · „Zgłoś jako nową potrzebę"
```

Zasady ugruntowania: model **nie może** proponować innowacji spoza wyników [2] (walidacja ID po stronie serwera). Brak dobrych dopasowań → komunikat „nie mamy jeszcze rozwiązania" + przejście do Kreatora / zgłoszenia potrzeby (to zasila trendy).

## 5. Mostek - agent, nie FAQ-bot

Jeden czat dostępny z każdego miejsca (pływający przycisk + pełny ekran). Rozumie kontekst strony, na której jest użytkownik.

**Narzędzia (tool runner, `strict: true`):**

| Narzędzie | Co robi | Efekt uboczny? |
|---|---|---|
| `search_innovations` | Hybrydowe wyszukiwanie (§4 krok 2) | nie |
| `get_innovation` | Szczegóły, materiały, film, kontakt do autora | nie |
| `get_region_challenges` | Dane z mapy wyzwań dla gminy/powiatu/obszaru | nie |
| `find_similar_needs` | Podobne zgłoszenia innych mieszkańców / JST | nie |
| `list_open_calls` | Aktualne nabory grantowe i ich kryteria | nie |
| `find_experts` | Eksperci wg dziedziny | nie |
| `draft_need_report` | Przygotowuje szkic zgłoszenia potrzeby | **szkic - użytkownik zatwierdza w UI** |
| `draft_idea_card` | Szkic fiszki pomysłu z rozmowy | **szkic - zatwierdza użytkownik** |
| `adapt_innovation` | Wdrożeniowiec: plan wdrożenia innowacji jako usługi dla danej instytucji | nie (zwraca dokument) |
| `visualize_idea` | Prompt → OpenAI Images → Storage | tak (koszt) - limit na użytkownika |
| `handoff_to_human` | Otwiera wątek do ROPS/eksperta z podsumowaniem rozmowy | **potwierdzenie w UI** |
| `navigate` | Sterowanie głosem/tekstem: „pokaż innowacje dla seniorów", „otwórz kreator" → przejście w UI z filtrami | nie |

**Tryb głosowy:** przycisk mikrofonu (push-to-talk, też spacją) → Edge Function `voice-transcribe` (OpenAI STT) → tekst trafia do Mosteka jak zwykła wiadomość (widoczny, edytowalny) → odpowiedź strumieniowana tekstem + opcjonalnie czytana (Edge Function `voice-speak`, OpenAI TTS). Świadomie **nie** Realtime speech-to-speech: droższe, a logika narzędzi i ugruntowanie musiałyby być zdublowane poza Claude. Limity: max 60 s nagrania, limit minut na użytkownika/dzień.

**Co odróżnia go od czatbota urzędowego:**
- Działa na danych platformy (narzędzia), zawsze pokazuje **źródła jako klikalne karty**, nie wymyśla.
- **Działa, a nie tylko odpowiada**: z rozmowy powstaje gotowe zgłoszenie / fiszka / szkic wniosku / plan wdrożenia - użytkownik tylko zatwierdza.
- **Dopytuje** jak doradca (gmina? kto jest odbiorcą? jaki budżet?) zamiast zwracać listę linków.
- **Tryb „prosty język"** (krótkie zdania, bez żargonu) i dyktowanie głosem - dla seniorów.
- **Przekazanie człowiekowi** z podsumowaniem, gdy temat wykracza poza bazę.
- Persona per rola: mieszkaniec / NGO / JST / ekspert - inny system prompt fragment (stała część cache'owana, rola doklejana po breakpoincie).

Akcje z efektem ubocznym nigdy nie wykonują się „same" - model tworzy szkic, UI pokazuje kartę „Zatwierdź / Edytuj".

## 6. Model danych (Postgres / Supabase)

```
profiles(id → auth.users, role: resident|ngo|jst|expert|admin, display_name, gmina, plain_language bool)

areas(id, slug, name)                                  -- obszary wyzwań (seniorzy, zdrowie psych., ...)
regions(id, teryt, name, type: gmina|powiat)

challenges(id, area_id, region_id?, title, summary, indicators jsonb, source_url, source_label, updated_at)
innovations(id, title, summary, description, area_ids int[], target_groups text[], stage,
            media jsonb (filmy, zdjęcia, pdf), author_org, contact, source_url,
            is_sample bool, embedding vector(1536), fts tsvector, published bool)
materials(id, title, kind: guide|canvas|video|report, url, area_ids int[], embedding vector(1536))

needs(id, author_id, raw_text, summary, area_id, region_id, target_group, keywords text[],
      status: new|in_review|matched|closed, embedding vector(1536), created_at)
matches(id, need_id, innovation_id, score, rationale, confidence, feedback: up|down|null)

ideas(id, author_id, title, essence, audience, stage, visual_url, status, embedding)
calls(id, title, rules jsonb, opens_at, closes_at, active bool)            -- nabory grantowe
applications(id, idea_id, call_id, content jsonb, status)

tests(id, innovation_id, title, description, slots, opens_at, closes_at)
test_signups(id, test_id, user_id)
reviews(id, innovation_id, user_id, rating 1-5, feedback, improvement)

threads(id, kind: question|mentoring|partnership, subject, created_by, related_type, related_id)
thread_members(thread_id, user_id)
messages(id, thread_id, author_id, body, created_at)
notifications(id, user_id, kind, payload jsonb, read_at)

consultant_sessions(id, user_id, messages jsonb, created_at)               -- historia czatu
ai_usage(id, user_id, route, model, input_tokens, output_tokens, cost_usd)  -- do slajdu o kosztach
```

**RLS (skrót):** treści wiedzy publiczne do odczytu; `needs`/`ideas` - autor + admin (+ eksperci w trybie do przeglądu); `threads` - tylko członkowie; trendy i `ai_usage` - tylko admin. Embeddingi i FTS liczone w triggerze / jobie przy zapisie.

## 7. Import danych (dane ROPS pojawią się później)

```
data/seed/*.json|csv  ──►  scripts/import.ts  ──►  upsert + embeddingi  ──►  Supabase
                              (walidacja zod, idempotentny po source_id)
```

- Teraz: seed **przykładowy** (~30 innowacji, ~10 wyzwań, ~15 materiałów, 2 nabory), na podstawie publicznych PDF-ów ROPS, oflagowany `is_sample = true` i oznaczony w UI.
- Po otrzymaniu paczki od ROPS: mapujemy format → `pnpm import data/rops/…` - kod aplikacji bez zmian.
- Panel ROPS: import CSV + edycja pojedynczych rekordów (wymaganie „szybkiej aktualizacji danych").
- Zero prawdziwych danych osobowych - użytkownicy i zgłoszenia syntetyczne.

## 8. Struktura repo

```
hubmi/
├─ app/
│  ├─ (public)/            strona główna, dopasuj, wiedza, innowacje/[id], wyzwania
│  ├─ (app)/               kreator, testuj, rozmowy, moje
│  ├─ admin/               panel ROPS: zgłoszenia, wiedza, import, trendy
│  └─ api/                 tylko krótkie trasy (< 10 s), np. webhooki, import CSV
├─ lib/
│  ├─ ai/                  anthropic.ts, openai.ts, prompts/, tools/ (1 plik = 1 narzędzie)
│  ├─ db/                  supabase clients (server/browser), typed queries
│  └─ match/               pipeline matchmakingu
├─ components/             ui/ (shadcn), consultant/, cards/, a11y/ (skip-link, tryb prosty)
├─ supabase/
│  ├─ migrations/          SQL: schemat, RLS, funkcja match_innovations
│  └─ functions/           Edge Functions (Deno): consultant (SSE, agent), match, visualize,
│                          application, adapt, voice-transcribe, voice-speak, embed
│     └─ _shared/          klienci AI, prompty, narzędzia agenta, CORS, auth z JWT
├─ scripts/import.ts
├─ data/seed/
└─ docs/                   ARCHITECTURE.md, AI.md (ujawnienie użycia AI), COSTS.md
```

## 9. Dostępność (WCAG 2.1 AA) - lista na prototyp

Skip-link, semantyczne nagłówki, focus widoczny, pełna obsługa klawiaturą (Base UI), kontrast ≥ 4.5:1, przełącznik rozmiaru tekstu i wysokiego kontrastu, tryb „prosty język" (UI + Mostek), etykiety formularzy i komunikaty błędów tekstem, `aria-live` dla strumienia odpowiedzi Mosteka, alternatywa tekstowa dla mapy wyzwań (tabela), napisy/transkrypcje przy filmach. Przed oddaniem: axe + przejście klawiaturą + VoiceOver na głównym scenariuszu.

## 10. Koszt utrzymania (szkic do slajdu)

| Pozycja | Szacunek / mies. |
|---|---|
| Supabase Pro | ~25 USD |
| Netlify (Free / Pro) | 0-19 USD |
| Anthropic (Opus 5.5: $4 / $20 za 1M tok., cache read $0.20) | zależny od ruchu - liczony z `ai_usage`, z cache'owaniem promptów |
| OpenAI embeddingi + obrazy | kilka-kilkanaście USD przy limicie obrazów na użytkownika |

Do dopracowania na koniec na podstawie realnych liczników z `ai_usage`.

## 11. Plan 24h

| Okno | Zakres |
|---|---|
| do ~15:00 | Szkielet Next.js + Supabase, migracje (schemat, RLS, pgvector, RPC), auth z rolami, layout + a11y bazowe |
| do ~18:00 | Seed przykładowy + import + embeddingi, **Dopasuj** end-to-end |
| do ~21:00 | **Mostek** (agent + narzędzia read-only, streaming, karty źródeł), **Wiedza** |
| do ~01:00 | **Panel ROPS** (zgłoszenia, edycja, import, trendy), **Rozmowy** + powiadomienia (Realtime) |
| do ~05:00 | **Kreator** (fiszka, generator wniosku, wizualizacja), **Testuj** |
| do ~08:00 | **Wdrożeniowiec**, narzędzia ze szkicami w Konsultancie, tryb prosty język, głos |
| do ~10:30 | Audyt a11y, deploy, dane demo, PDF 10 slajdów, film 3 min, zgłoszenie na hacktribe |

Zasada: każdy moduł najpierw w wersji „działa end-to-end", dopiero potem szlif.

## 12. Dwa mechanizmy AI (stan po migracji 20261003130000)

**A. Knowledge RAG** - `documents` → PDF w Storage → ekstrakcja tekstu per strona (`unpdf`) → chunki ~1400 znaków z zakładką i zakresem stron → embeddingi → `document_chunks` → `match_chunks` (RRF: wektor + FTS) → Mostek odpowiada z cytatem „dokument, s. X-Y”.

**B. Innovation Matchmaker** - przy ingestion Claude normalizuje opis do struktury (problem, potrzeby, kategorie i grupy ze wspólnej taksonomii `lib/ai/taxonomy.ts`, lokalizacja, wymagania wdrożeniowe, zasoby) + `search_text` z potocznymi sformułowaniami → embedding. Zapytanie użytkownika przechodzi tę samą normalizację → `match_innovations` (0.65 wektor + 0.2 FTS + 0.15 zgodność kategorii/grup) → rerank i uzasadnienie przez Claude.

**CMS (Panel ROPS)** - deklaratywny (`lib/cms/resources.ts`): jedna definicja = lista, formularz, zapis przez sesję admina (RLS). Przycisk „Przetwórz AI” uruchamia ingestion A lub B; pliki idą z przeglądarki prosto do Supabase Storage.

## 13. „Kaganiec” AI - polityka ROPS, dozwolone źródła, moderacja

Jedna tabela `ai_policy` (pojedynczy rekord), edytowana w Panelu ROPS prostymi przełącznikami. Każde wywołanie LLM przechodzi przez wspólną warstwę `lib/ai/guard.ts`:

```
wejście użytkownika
  → [1] filtr deterministyczny: lista wulgaryzmów PL (+ odmiany), dane osobowe (PESEL, telefon, e-mail) → maskowanie
  → [2] OpenAI Moderation (bezpłatne): obraźliwość, nienawiść, przemoc, samookaleczenia → blokada / komunikat wsparcia
  → [3] Mostek (Claude) z promptem systemowym budowanym z ai_policy:
        • odpowiada WYŁĄCZNIE na podstawie wyników narzędzi (dozwolone źródła: innowacje, dokumenty RAG, wyzwania, nabory)
        • brak źródła → „nie wiem / przekażę do ROPS”, nigdy wiedza ogólna modelu
        • tematy wyłączone przez ROPS (polityka, porady medyczne/prawne, religia, …) → grzeczna odmowa + skierowanie
  → [4] kontrola wyjścia: każda wskazana innowacja/dokument musi istnieć w wynikach narzędzi (walidacja ID), filtr [1] na odpowiedzi
  → log do ai_usage + ai_moderation_events (panel: co i dlaczego zablokowano)
```

Przełączniki ROPS (przykłady): blokuj wulgaryzmy · blokuj obraźliwe treści · tylko dozwolone źródła · bez porad medycznych · bez porad prawnych · bez polityki · bez tematów spoza polityki społecznej · własna lista zakazanych tematów · własny komunikat odmowy · generowanie obrazów wł./wył. · tryb głosowy wł./wył.

## 14. Kontrola kosztów (Panel ROPS → „Koszty AI”)

- Każde wywołanie (Claude, embeddingi, obrazy, STT/TTS) zapisuje tokeny/jednostki i koszt w `ai_usage` (`lib/ai/usage.ts`).
- Limity w `ai_policy`: miesięczny budżet USD, dzienny limit na użytkownika/sesję, limit obrazów i minut głosu.
- Progi: 80% budżetu → alert w panelu; 100% → tryb oszczędny (wyłączone obrazy i TTS, niższy `effort`), twarde zatrzymanie opcjonalne.
- Widok: koszt dziś / miesiąc / prognoza, podział na funkcje (Mostek, matchmaking, ingestion, obrazy, głos), top sesje.

## 15. WCAG 2.1 AA od pierwszego ekranu

Zasady dla każdego komponentu (lista kontrolna w PR):
- Semantyczny HTML, jeden `h1`, logiczne nagłówki, landmarki (`header/nav/main/footer`), skip-link.
- Pełna obsługa klawiaturą, widoczny focus (min. 2 px, kontrast ≥ 3:1), brak pułapek fokusu w dialogach.
- Kontrast tekstu ≥ 4.5:1 (duży ≥ 3:1) w obu motywach; informacja nigdy tylko kolorem (statusy = ikona + tekst).
- Formularze: etykiety, `aria-describedby` dla podpowiedzi i błędów, błędy opisane tekstem, `autocomplete`.
- Treści dynamiczne (strumień Mostka, wyniki dopasowania) w regionach `aria-live="polite"`.
- Pasek dostępności w nagłówku: większy tekst (3 poziomy), wysoki kontrast, „prosty język”, ograniczenie animacji (`prefers-reduced-motion`), zapamiętywane lokalnie.
- Filmy z napisami/transkrypcją, obrazy z `alt`, mapy i wykresy z alternatywą tabelaryczną.
- Testy: axe (automat), przejście klawiaturą i VoiceOver po głównym scenariuszu przed demo.

## 16. Sterowanie głosem - „Powiedz Mostkowi”

- Przycisk mikrofonu w nagłówku na każdej stronie + skrót klawiszowy (np. `Alt+M`), push-to-talk.
- Mowa → tekst (OpenAI STT) → **ten sam Mostek** z narzędziem `navigate` i narzędziami modułów:
  „Pokaż innowacje dla seniorów”, „Chcę zgłosić problem”, „Przeczytaj mi trzecie rozwiązanie”, „Połącz mnie z ROPS”, „Większa czcionka”.
- Komendy dostępności (większy tekst, kontrast, czytaj na głos) obsługiwane lokalnie bez LLM - natychmiast i za darmo.
- Odpowiedź tekstem + opcjonalnie czytana (TTS); rozpoznany tekst zawsze widoczny i edytowalny przed wysłaniem.
