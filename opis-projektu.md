# MostIn - Twój Most do Innowacji Społecznych

> Szkic opisu projektu na HackYeah 2026 (wyzwanie UMWM / ROPS Kraków: Małopolski Hub Innowacji Społecznych). Stan na sobotę ok. 19:00. Do redakcji.

**Nazwa projektu:** MostIn (mostin.pl)
**Asystent AI:** Mostek
**Zespół:** Maciej Senderowski (solo)
**Demo:** https://mostin.pl (bez logowania: wejście przez persony demo)
**Repozytorium:** https://github.com/AnasharS/mostin

---

## Krótki opis (1 akapit)

MostIn to cyfrowe serce Małopolskiego Hubu Innowacji Społecznych: **most między problemem społecznym, sprawdzoną innowacją, wiedzą ROPS i ludźmi, którzy mogą pomóc**. Mieszkaniec, organizacja albo gmina opisuje problem własnymi słowami, a MostIn dopasowuje innowacje z Biblioteki ROPS i wyjaśnia, dlaczego pasują. Pomaga dostosować wybrane rozwiązanie do warunków instytucji, prowadzi przez kanwę nowego pomysłu aż do wniosku grantowego i łączy osoby w podobnej sytuacji. Nad wszystkimi modułami działa Mostek, asystent AI, który odpowiada wyłącznie na podstawie danych zatwierdzonych przez ROPS i każdą informację podaje ze źródłem.

## Problem

ROPS ma ogromny zasób wiedzy: ponad 200 opracowanych innowacji, raporty, diagnozy, Mapę Wyzwań Społecznych i sieć ekspertów. Jak mówi sam ROPS: **„Wszystko istnieje, ale ze sobą nie rozmawia”**. Osoba z problemem (np. mama dziecka ze spastycznością, gmina z rosnącą liczbą rodzin cudzoziemców, fundacja walcząca z samotnością seniorów) nie wie, że rozwiązanie już istnieje, gdzie go szukać, jak je wdrożyć u siebie ani kogo zapytać.

## Rozwiązanie: 7 modułów + Mostek

1. **Matchmaking społeczny** (moduł obowiązkowy). Opis problemu naturalnym językiem → analiza AI → wyszukiwanie hybrydowe (znaczenie + słowa kluczowe + kategorie) w 115 innowacjach → ranking z oceną 0-100, **uzasadnieniem „dlaczego pasuje”, „co dostosować” i „pierwszym krokiem”**. Uczciwa ocena pokrycia: gdy dobrego rozwiązania brak, MostIn mówi to wprost i prowadzi do Kreatora.
2. **Zasobnik wiedzy.** Biblioteka 115 innowacji z filtrami, dokumenty ROPS (raporty, Mapa Wyzwań, regulamin i opisy naboru „Usługa Wrażliwa”, dokumentacja modeli innowacji z paczek ZIP: ponad 280 dokumentów i 7000 fragmentów z numerami stron), Mapa Wyzwań Społecznych (8 obszarów, 51 wyzwań), aktualności. Odpowiedzi z cytatem „Raport X, s. 27”. Trendy potrzeb widoczne dla administratora.
3. **Kreator pomysłów.** Prowadzenie krok po kroku po **kanwie innowacji społecznej ROPS / INNO AGH**. Mostek sprawdza, czy pomysł **nie powiela innowacji już inkubowanych** (wymóg naboru), wskazuje mocne strony i luki oraz generuje **wizualizację pomysłu**. Fiszkę wysyła się do ROPS jednym kliknięciem. **Generator wniosku do naboru „Inkubator Włączenia Społecznego 2.0”** według prawdziwego wzoru formularza, z diagnozą opartą na raportach ROPS.
4. **Tester innowacji + lista oczekujących.** Nabory testów. Profil potrzeb (za zgodą) sprawia, że gdy ROPS otwiera test pasującej innowacji, osoby z listy dostają zaproszenie.
5. **Middleman Innowacji: „Dostosuj z Mostkiem”.** Typ instytucji, odbiorcy, ludzie, budżet, czas i ograniczenia → plan wdrożenia: ocena wykonalności, tabela „w oryginale / u Ciebie”, etapy, budżet, partnerzy, ryzyka, wskaźniki, **pierwszy tydzień**, założenia do sprawdzenia.
6. **Platforma aktywnej komunikacji: Rozmowy z ROPS.** Pytanie, prośba o eksperta lub partnerstwo, także przekazanie sprawy przez Mostka z gotowym podsumowaniem. ROPS dostaje sprawę z **triażem AI** (kategoria, priorytet, streszczenie i szkic odpowiedzi do zatwierdzenia przez człowieka). Mierzony jest czas pierwszej odpowiedzi.
7. **Panel administratora (ROPS).** CMS treści z przetwarzaniem AI jednym kliknięciem, **synchronizacja z Biblioteką ROPS** (tylko zmienione treści), skrzynka rozmów, otwieranie testów, **ustawienia AI** (osobowość, ograniczenia, budżet), dziennik moderacji, koszty.

**Strefa JST: główna ścieżka dla samorządów (wskazanie ROPS).**
- **Radar naborów** z odliczaniem dni („do 600 000 zł, bez wkładu własnego, zostało 12 dni”) i dodaniem terminu do kalendarza.
- **Test kwalifikacji w 60 sekund:** 4 pytania zbudowane wyłącznie z faktów regulaminu, każde z cytatem strony.
- **Przedwstępny wniosek**, który od razu trafia do ROPS.
- **Asystent grantowy**: Mostek przeprowadza pracownika gminy przez regulamin naboru „Usługa Wrażliwa” i dokumentację modeli innowacji (np. „ile osób potrzeba do Terapeuty przestrzeni?” z cytatem ze strony modelu), porównuje wymagania z zasobami gminy i proponuje, jak uzupełnić braki.
- Kontakt zbierany na starcie, więc **ROPS widzi leady gmin z podsumowaniem AI** (gotowość, bariery, następny krok), nawet gdy ktoś przerwie.

**Mostek, asystent AI nad całą platformą.** Użytkownik nie musi wiedzieć, którego modułu potrzebuje. Mostek wyszukuje innowacje, odpowiada z dokumentów ze źródłami, sprawdza Mapę Wyzwań i proponuje następny krok przyciskiem: dostosuj, kreator, testy, Przęsła, rozmowa z ROPS. Jest dostępny na każdej stronie (Alt+M) i zna kontekst bieżącej strony. Przy pierwszej wizycie pyta „Powiedz mi, kim jesteś” i kieruje na właściwą ścieżkę. **Tryb głosowy** (mów i słuchaj) jest dla mieszkańców, w tym osób niewidomych i słabowidzących. ROPS włącza go dla wybranych podstron, wybiera głos i widzi koszty.

## Co tworzy nową jakość (wyróżniki)

- **Przęsła: kręgi wsparcia.** „W Twojej okolicy 4 rodziny mają podobną sytuację.” Rozmowa pod pseudonimem, bez oceniania, za zgodą, z możliwością spotkania na żywo. Zaczątek platformy integracyjnej dla osób z większymi potrzebami.
- **„Kaganiec” AI, o którym decyduje ROPS.** Przełączniki: tylko dozwolone źródła, bez porad medycznych, prawnych i politycznych, własne tematy wyłączone, blokada wulgaryzmów i obelg, maskowanie danych osobowych, budżet i limity. **Osobowość Mostka wybierana z 6 archetypów marki** (Opiekun, Mędrzec, Towarzysz, Przewodnik, Twórca, Bohater).
- **AI, które nie zmyśla:** wybiera wyłącznie z bazy (walidacja identyfikatorów), cytuje strony dokumentów, oznacza braki [DO UZUPEŁNIENIA], a w razie braku danych mówi „nie wiem” i przekazuje sprawę człowiekowi.
- **Synchronizacja zamiast ręcznego wpisywania:** importer Biblioteki ROPS z porównaniem skrótu treści. Przy aktualizacji AI przetwarza tylko to, co się zmieniło.
- **Liczby tylko ze źródła ROPS:** kluczowe fakty naboru mają dosłowny cytat i automatyczną weryfikację w dokumencie (`pnpm verify:facts`). Test na liczbach wykrył i pozwolił naprawić przeoczenie „brak wkładu własnego”.
- **Pomysły według kategorii:** ROPS widzi, w jakich obszarach mieszkańcy i organizacje zgłaszają pomysły. **Ogłoszenie naboru automatycznie powiadamia autorów pomysłów z pasujących obszarów.**
- **Dokumentacja modeli innowacji z paczek ZIP ROPS** jest przeszukiwalna (instrukcje, specyfikacje, modele pracy), z cytatem strony.
- **Trafność sprawdzona na realnych scenariuszach** (np. „syn ma spastyczność rąk, nie stać mnie na rehabilitację” → Edki: kredki terapeutyczne jako pierwsza propozycja).

## Dostępność (WCAG 2.1 AA)

- Kontrasty sprawdzone w palecie marki: tekst 16:1, przyciski 5:1. Pomarańcz marki tylko tam, gdzie wystarcza 3:1.
- Krój **Atkinson Hyperlegible** zaprojektowany dla osób słabowidzących.
- Pasek dostępności na każdej stronie: powiększenie tekstu, wysoki kontrast, **prosty język** (przekazywany także do AI), wyłączenie animacji.
- Pełna obsługa klawiaturą, widoczny fokus, skip-link, landmarki, etykiety pól, komunikaty dla czytników ekranu (regiony live, fokus na wynikach), formularze zamiast wymogu „rozmowy z AI”.
- Persony bez logowania i formularze z opcjami do zaznaczenia zamiast pustych pól, z myślą o seniorach i osobach o niskich kompetencjach cyfrowych.
- W planie: sterowanie głosem (mowa → Mostek, komendy dostępności lokalnie).

## Bezpieczeństwo i dane

- Supabase (PostgreSQL, region UE) z **Row Level Security na każdej tabeli**. Panel ROPS zapisuje przez sesję administratora.
- **Dane kontaktowe w osobnych tabelach, nigdy nie trafiają do modeli AI.** Opisy sytuacji są maskowane z danych osobowych (PESEL, telefon, e-mail, konto). Nie wymagamy informacji o niepełnosprawności, wystarczą obszary potrzeb.
- Wejście bez login walla: anonimowe sesje z rolą nadaną po stronie serwera. Persona administratora jest dostępna tylko w trybie demo.
- Moderacja wejścia i wyjścia, dziennik zdarzeń dla ROPS, ochrona przed prompt injection (treści dokumentów traktowane jako dane).
- Dane demo osób są **syntetyczne**. Dane innowacji i dokumentów pochodzą ze źródeł publicznych ROPS (Biblioteka Innowacji na licencji CC BY 4.0, źródło podane przy każdej pozycji).

## Technologia

Next.js 16 (TypeScript), Supabase (PostgreSQL + pgvector, RLS, Storage), Claude Opus 5.5 / Sonnet 5.5 (Anthropic) do analizy, ocen, planów i asystenta, OpenAI (embeddingi, wizualizacje, moderacja; w planie mowa), hosting Netlify + Supabase. Architektura API-first, gotowa do integracji z innymi systemami Hubu (np. bazą grantową).

## Wdrożenie i koszty utrzymania

- **Infrastruktura:** Supabase Pro ~25 USD/mies., Netlify Pro ~19 USD/mies.
- **Tryb głosowy:** rozpoznawanie mowy ~0,003 USD/min, czytanie odpowiedzi ~0,015 USD/min. 1000 rozmów głosowych miesięcznie to ok. 50 USD. ROPS włącza głos per podstrona (domyślnie tylko dla mieszkańców).
- **AI, zmierzone na prototypie:** dopasowanie ~0,07 USD, odpowiedź Mostka ~0,05-0,10 USD, plan wdrożenia ~0,10 USD, ocena pomysłu ~0,04 USD, wizualizacja ~0,01 USD, triaż sprawy ~0,01 USD, pełny szkic wniosku ~0,5-0,8 USD. **Import całej Biblioteki ROPS jednorazowo ~3 USD**, synchronizacja tylko zmian to centy.
- **Przykład skali regionalnej:** 500 dopasowań, 1000 rozmów z Mostkiem, 50 planów i 20 wniosków miesięcznie daje **ok. 150-200 USD/mies. za AI**. Budżet, limity dzienne i tryb oszczędny ustawia ROPS w panelu.
- **Utrzymanie treści:** synchronizacja z Biblioteką ROPS (docelowo automatycznie raz dziennie), CMS dla pracowników ROPS i import dokumentów PDF jednym kliknięciem.

## Użycie AI w projekcie (ujawnienie)

- **W produkcie:** Claude Opus 5.5 i Sonnet 5.5 (Anthropic), OpenAI `text-embedding-3-small`, `gpt-image-1`, `omni-moderation-latest`, `gpt-4o-mini-transcribe`, `gpt-4o-mini-tts`.
- **W trakcie budowy:** asystent kodowania Claude Code (Anthropic). Część danych (normalizacja 46 innowacji, struktura Mapy Wyzwań) przygotowano przez ekstrakcję w sesji asystenta, z tym samym schematem walidacji co produkcyjny pipeline.
- Wszystkie decyzje techniczne są opisane w repozytorium (`notatki.md`, `ARCHITECTURE.md`).

## Co dalej

Komendy głosowe nawigacji; zweryfikowane organizacje i wydarzenia (np. kawiarnia aktywizująca osoby z niepełnosprawnością dodaje zajęcia, a ROPS je weryfikuje); automatyczna synchronizacja przez cron; powiadomienia e-mail i SMS; pełny audyt WCAG; integracja z bazą grantową ROPS.
