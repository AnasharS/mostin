@AGENTS.md

# Zasady projektu MostIn

## Typografia: bez długich pauz
- **Nigdzie w projekcie nie stosujemy długich pauz (U+2014) ani półpauz (U+2013).** Zamiast nich zawsze zwykły łącznik „-” (np. „MostIn - Panel ROPS”, „s. 70-71”).
- Dotyczy wszystkiego: tekstów w interfejsie, komunikatów, promptów, danych seed, dokumentacji (`notatki.md`, `opis-projektu.md`, `ARCHITECTURE.md`), komentarzy i commitów.
- Treści generowane przez AI: prompt zabrania pauz (`policyPrompt` w `lib/ai/policy.ts`), a każde wyjście modeli przechodzi przez `noDashes()` z `lib/text.ts` (strumień Mostka i structured outputs). Dane importowane ze źródeł są czyszczone przy zapisie.
- Przed commitem: `grep -rnP "[\x{2013}\x{2014}]" app components lib scripts supabase data *.md` musi zwracać pusto (poza AGENTS.md, który generuje Next.js).

## Inne
- Dokumentacja decyzji technicznych do pitcha: `notatki.md` (jedno źródło, aktualizowane przy każdej funkcji).
- Nie wypychamy na GitHub (Netlify) bez wyraźnej zgody właściciela projektu.
- Nie uruchamiamy `pnpm build`, gdy działa serwer deweloperski (nadpisuje `.next`).
- Ikony: jednokolorowe SVG (lucide-react), bez emoji.

## Fakty i liczby: nie zgadujemy
- **Liczb, kwot, progów, terminów i warunków (granty, nabory, przepisy, dane) nie zgadujemy - ani w kodzie, ani w promptach, ani w treściach.** Muszą być potwierdzone w źródle ROPS (dokument w bazie wiedzy) i podawane z cytatem i numerem strony.
- Kluczowe fakty naboru „Usługa Wrażliwa” są w `lib/jst/facts.ts` z dosłownym cytatem; `pnpm verify:facts` sprawdza, że każdy cytat występuje w zaimportowanym dokumencie. Nowy fakt dodajemy tylko razem z cytatem i weryfikacją.
- Modele AI mają w prompcie zakaz zgadywania (`policyPrompt`): gdy źródło czegoś nie zawiera, mówią to wprost i kierują pytanie do ROPS.
- Testy jakości robimy na konkretnych liczbach ze źródeł (np. kwota grantu, wkład własny), a nie tylko „czy odpowiedź brzmi dobrze”.
