# MostIn - Twój Most do Innowacji Społecznych

HackYeah 2026, zadanie UMWM / ROPS Kraków: Małopolski Hub Innowacji Społecznych.

**Nazwa projektu:** MostIn (mostin.pl)
**Asystent AI:** Mostek
**Zespół:** Maciej Senderowski (solo)
**Demo:** https://mostin.pl (bez logowania, przełącznik DEMO u góry strony)
**Repozytorium:** https://github.com/AnasharS/mostin

---

## Krótki opis

MostIn łączy problem społeczny ze sprawdzoną innowacją, wiedzą ROPS i ludźmi, którzy mogą pomóc. Mieszkaniec, organizacja albo gmina opisuje problem własnymi słowami, a MostIn dopasowuje innowacje z Biblioteki ROPS i wyjaśnia, dlaczego pasują. Pomaga dostosować rozwiązanie do warunków instytucji, prowadzi od pomysłu do wniosku grantowego, zbiera chętnych do testów i łączy osoby w podobnej sytuacji. Nad wszystkim działa Mostek, asystent AI, który odpowiada tylko na podstawie danych ROPS i każdą informację podaje ze źródłem.

## Problem

ROPS ma ogromny zasób wiedzy: blisko 200 innowacji w portfolio, raporty, diagnozy, Mapę Wyzwań Społecznych i sieć ekspertów. Ale, jak mówi sam ROPS, **„wszystko istnieje, ale ze sobą nie rozmawia”**. Mama dziecka ze spastycznością, gmina z rosnącą liczbą rodzin cudzoziemców czy fundacja walcząca z samotnością seniorów nie wiedzą, że rozwiązanie już istnieje, jak je u siebie wdrożyć ani kogo zapytać.

## Rozwiązanie: 7 modułów i Mostek

1. **Matchmaking społeczny** (moduł obowiązkowy). Opis problemu pisany albo mówiony → ranking innowacji z oceną 0-100, **„dlaczego pasuje”, „co dostosować” i „pierwszy krok”**. Obok podobne zgłoszenia innych osób (anonimowo), fakty z Mapy Wyzwań i fragment raportu ROPS ze stroną. Gdy dobrego rozwiązania brak, MostIn mówi to wprost i prowadzi do Kreatora. Dopasowanie jest dla każdego: osobne wejścia dla mieszkańców, gmin i organizacji, ten sam silnik. Rzadkie słowa z opisu (np. „spastyczność”) mają pierwszeństwo przed ogólnymi, więc trafna innowacja nie ginie wśród ogólnych dopasowań.
2. **Zasobnik wiedzy (Baza wiedzy).** Biblioteka 115 innowacji z wyszukiwaniem i filtrami na żywo, filmy (26 innowacji), Mapa Wyzwań (8 obszarów, 51 wyzwań), raporty ROPS, materiały edukacyjne. Mostek przeszukuje 285 dokumentów (w tym dokumentację modeli innowacji z paczek ZIP), łącznie 7708 fragmentów z numerami stron. **Trendy potrzeb** widzi tylko ROPS: gdzie potrzeb przybywa, a rozwiązań brakuje.
3. **Kreator pomysłów.** Fiszka pomysłu zawsze otwarta, oparta na kanwie innowacji społecznej ROPS / INNO AGH. Mostek sprawdza, czy pomysł **nie powiela innowacji już inkubowanych** (wymóg naboru), i wskazuje mocne strony, luki i następny krok. Obraz pomysłu: własne zdjęcie albo ilustracja AI. Fiszka trafia do ROPS jednym kliknięciem. W trakcie naboru **generator wniosku „Inkubator Włączenia Społecznego 2.0”** według prawdziwego wzoru, z diagnozą z raportów ROPS, do pobrania jako .docx i .odt.
4. **Tester innowacji.** Zgłoszenie do testu jednym kliknięciem, też ze strony innowacji. Profil potrzeb (za zgodą) tworzy listę oczekujących: gdy ROPS otwiera test, pasujące osoby dostają zaproszenie. Oceny, „co działa” i propozycje usprawnień trafiają do ROPS.
5. **Platforma aktywnej komunikacji.** „Napisz do ROPS” bez konta: pytanie, prośba o eksperta lub partnerstwo, także przekazanie sprawy przez Mostka z gotowym podsumowaniem. ROPS dostaje powiadomienie i **triaż AI** (kategoria, priorytet, streszczenie, szkic odpowiedzi do zatwierdzenia przez człowieka). Odpowiedź wraca do tego samego wątku, a czas pierwszej odpowiedzi jest mierzony. **Panel mentora** dla ekspertów.
6. **Panel administratora (ROPS).** Pulpit „Do zrobienia”, CMS bez JSON-a z przetwarzaniem AI jednym kliknięciem, **synchronizacja z Biblioteką ROPS** (tylko zmienione treści), leady gmin, rozmowy, pomysły według obszarów, trendy, zgłoszenia z Przęseł, opinie z testów, **ustawienia AI** (osobowość, ograniczenia, budżet, limity) i koszt AI w miesiącu.
7. **Middleman Innowacji: „Dostosuj z Mostkiem”.** Typ instytucji, odbiorcy, ludzie, budżet, czas i ograniczenia → plan wdrożenia: ocena wykonalności, tabela „w oryginale / u Ciebie”, etapy, budżet, partnerzy, ryzyka, wskaźniki, **pierwszy tydzień**, założenia do sprawdzenia. Wejście przy wynikach dopasowania w ścieżkach gmin i organizacji oraz z Mostka.

**Strefa dla gmin (wskazanie ROPS).**
- **Radar naborów** z odliczaniem dni i warunkami, każda liczba z cytatem strony regulaminu. Termin do kalendarza Google, Outlook albo .ics.
- **Test kwalifikacji w 60 sekund**: 4 pytania tylko z faktów regulaminu.
- **Przedwstępny wniosek**, który od razu trafia do ROPS.
- **Asystent grantowy**: Mostek przeprowadza pracownika gminy przez regulamin „Usługi Wrażliwej” i dokumentację modeli, porównuje wymagania z zasobami gminy i podpowiada, jak uzupełnić braki.
- Kontakt zbierany na starcie, więc **ROPS ma leada z podsumowaniem AI** (gotowość, bariery, następny krok), nawet gdy ktoś przerwie.

**Mostek, asystent nad całą platformą.** Użytkownik nie musi wiedzieć, którego modułu potrzebuje. Mostek wyszukuje innowacje, odpowiada z dokumentów ze źródłami, sprawdza Mapę Wyzwań, nabory i Przęsła i proponuje następny krok przyciskiem. Jest na każdej stronie (Alt+M), zna stronę i ścieżkę użytkownika. **Tryb głosowy** (mów i słuchaj) pomaga osobom, którym trudno pisać lub czytać. W panelu ROPS Mostek odpowiada też na pytania o koszty AI.

## Co tworzy nową jakość

- **Przęsła: kręgi wsparcia.** „W Twojej okolicy 3 osoby mają podobną sytuację.” Rozmowa pod pseudonimem, za zgodą, z możliwością spotkania. Kontakt prywatny tylko za zgodą obu stron. ROPS nie czyta rozmów, rozpatruje tylko zgłoszone wiadomości.
- **AI pod kontrolą ROPS.** Przełączniki: tylko dozwolone źródła, bez porad medycznych, prawnych i politycznych, własne tematy wyłączone, blokada wulgaryzmów i obelg, maskowanie danych osobowych, budżet i limity. **Osobowość Mostka z 6 archetypów marki.** Dziennik moderacji po polsku. **Koszty według modeli** (tokeny, minuty, obrazy) zgodne z rachunkiem dostawcy, a po przekroczeniu budżetu tryb oszczędny: tańszy model, bez ilustracji i głosu.
- **AI, które nie zmyśla.** Wybiera tylko z bazy (sprawdzanie identyfikatorów), cytuje strony dokumentów, oznacza braki [DO UZUPEŁNIENIA], a gdy danych brak, mówi „nie wiem” i przekazuje sprawę człowiekowi.
- **Liczby tylko ze źródła ROPS.** Kluczowe fakty naboru mają dosłowny cytat i automatyczne sprawdzenie w dokumencie (`pnpm verify:facts`).
- **Synchronizacja zamiast przepisywania.** Importer Biblioteki ROPS przetwarza przez AI tylko to, co się zmieniło.
- **Ogłoszenie naboru powiadamia autorów pomysłów** z pasujących obszarów.
- **Trafność sprawdzona na prawdziwych scenariuszach.** „Syn ma spastyczność rąk, nie stać mnie na rehabilitację” → Edki, kredki terapeutyczne, jako pierwsza propozycja (wcześniej 8. miejsce).

## Dostępność (WCAG 2.1 AA)

- Krój **Atkinson Hyperlegible**, zaprojektowany dla osób słabowidzących. Kolory marki sprawdzone pod kontrast.
- Pasek dostępności na każdej stronie: większy tekst, wysoki kontrast, **prosty język, który zmienia wszystkie odpowiedzi AI dla mieszkańców**, wyłączenie animacji.
- Pełna obsługa klawiaturą, widoczny fokus, „Przejdź do treści”, okruszki, etykiety pól, komunikaty dla czytników ekranu.
- Formularze z opcjami do zaznaczenia, bez konieczności prowadzenia rozmowy. Bez konta i bez hasła.
- **Automatyczny test axe-core: 0 naruszeń WCAG 2.0 / 2.1 A i AA na 16 stronach publicznych i 6 w widoku telefonu.** Pełny audyt z czytnikiem ekranu jest w planie.

## Bezpieczeństwo i dane

- Supabase (PostgreSQL, region UE) z **Row Level Security na każdej tabeli**. Klucz serwisowy tylko na serwerze, po sprawdzeniu uprawnień.
- **Dane kontaktowe w osobnych tabelach, nigdy nie trafiają do AI.** Dane osobowe w opisach są maskowane (PESEL, telefon, e-mail, konto). Serwis nie pyta o niepełnosprawność ani diagnozy.
- Bez konta: anonimowa sesja w ciasteczku httpOnly. Persona administratora tylko w trybie demo.
- Zdjęcia od użytkowników: rozpoznanie typu po zawartości, limit rozmiaru i dzienny, moderacja przed zapisem. Nagrania głosu nie są zapisywane.
- Bez analityki i śledzenia, tylko ciasteczka niezbędne.
- Ochrona przed prompt injection: treść dokumentów to dla AI dane, nie polecenia.
- Dane osób w demo są **syntetyczne**. Innowacje i dokumenty pochodzą z publicznych źródeł ROPS (Biblioteka Innowacji na licencji CC BY 4.0, źródło przy każdej pozycji).

## Demo

Przełącznik DEMO u góry strony: **Niezalogowany**, **Mieszkanka Anna** (opiekuje się mamą po udarze, ma profil potrzeb i krąg w Przęsłach), **Mentor dr Marek** (Panel mentora), **Koordynatorka ROPS** (pełny panel z przykładowymi danymi). Bez haseł. Logowanie e-mailem i ustawienia konta są w demo pokazane jako makieta.

## Technologia

Next.js 16 (TypeScript, Tailwind 4, Base UI), Supabase (PostgreSQL + pgvector, RLS, Storage), Claude Opus 5.5 i Sonnet 5.5 do analizy, ocen, planów, wniosków i asystenta, OpenAI do embeddingów, ilustracji, moderacji i głosu. Hosting Netlify + Supabase. API gotowe do integracji z innymi systemami Hubu, np. z bazą grantową.

## Wdrożenie i koszty utrzymania

- **Infrastruktura:** Supabase Pro ok. 25 USD / mies., Netlify Pro ok. 19 USD / mies.
- **AI, zmierzone na prototypie:** dopasowanie ok. 0,06 USD, odpowiedź Mostka ok. 0,08 USD (kolejne w rozmowie 0,015-0,03 USD dzięki cache), plan wdrożenia ok. 0,10 USD, ocena pomysłu ok. 0,04 USD, ilustracja ok. 0,04 USD, triaż sprawy ok. 0,01 USD, szkic wniosku 0,5-0,8 USD. **Import całej Biblioteki ROPS jednorazowo ok. 3 USD**, kolejne synchronizacje to grosze.
- **Głos:** 1000 rozmów głosowych miesięcznie to ok. 51 USD. ROPS włącza głos per podstrona.
- **Przykład dla regionu:** 500 dopasowań, 1000 rozmów z Mostkiem, 50 planów i 20 wniosków miesięcznie to **ok. 130-170 USD / mies. za AI**, w trybie oszczędnym ok. połowa. Budżet, limity i tryb oszczędny ustawia ROPS, a koszt miesiąca widać na pulpicie panelu.
- **Treści:** synchronizacja z Biblioteką ROPS, CMS dla pracowników, import dokumentów PDF jednym kliknięciem.

## Użycie AI

- **W produkcie:** Claude Opus 5.5 i Sonnet 5.5 (Anthropic), OpenAI `text-embedding-3-small`, `gpt-image-1`, `omni-moderation-latest`, `gpt-4o-mini-transcribe`, `gpt-4o-mini-tts`.
- **Przy budowie:** asystent kodowania Claude Code (Anthropic). Część danych (uporządkowanie opisów 46 innowacji i Mapa Wyzwań) przygotowałem z jego pomocą w trakcie pracy, bez osobnych wywołań API, i sprawdziłem tym samym schematem walidacji co produkcyjny import.
- Decyzje techniczne i architektura: `notatki.md`, `ARCHITECTURE.md`.

## Możliwe rozszerzenia

Architektura jest przygotowana m.in. pod: powiadomienia e-mail i SMS (dziś powiadomienia są w serwisie), automatyczna synchronizacja z harmonogramu, prawdziwe logowanie dla mieszkańców, zweryfikowane organizacje i wydarzenia (np. kawiarnia aktywizująca osoby z niepełnosprawnością dodaje zajęcia, a ROPS je zatwierdza), pełny audyt WCAG z czytnikiem ekranu, integracja z bazą grantową ROPS.
