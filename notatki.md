# MostIn - notatki

Moje notatki do pitchu i dla ROPS: co zbudowałem, jak to działa i dlaczego tak. Zadanie UMWM / ROPS Kraków (Małopolski Hub Innowacji Społecznych), HackYeah 2026, praca solo.

---

## 1. Założenia

- **Dlaczego to zadanie.** Punktacja nagradza liczbę działających modułów (matchmaking 10%, każdy kolejny +5%), a ROPS chce dalej rozwijać zwycięski prototyp. Zrobiłem wszystkie siedem modułów i jednego asystenta nad nimi.
- **Stack.** Next.js 16 (TypeScript, Tailwind 4, Base UI), Supabase (Postgres + pgvector, RLS, Auth, Storage), Claude Opus 5.5 i Sonnet 5.5, OpenAI do embeddingów, obrazów, mowy i moderacji. Hosting Netlify + Supabase w UE.
- **Trzy zasady:**
  1. AI nie zgaduje. Liczby, kwoty, terminy i warunki tylko ze źródła ROPS, z cytatem i numerem strony. Jak źródła brak, Mostek mówi to wprost i kieruje do człowieka.
  2. Dostępność od pierwszego ekranu, nie na koniec.
  3. Bez ściany logowania. Mieszkaniec korzysta bez konta, pod pseudonimem.

## 2. Moduły

### I. Matchmaking społeczny (obowiązkowy) - „Znajdź rozwiązanie”
- Opisujesz problem własnymi słowami (pisząc albo głosem), dostajesz innowacje z oceną 0-100, „dlaczego pasuje”, „co dostosować” i „pierwszy krok”.
- Dopasowanie jest dla każdego, nie tylko dla mieszkańców: trzy wejścia (Dla Mieszkańców, Dla gmin, Dla organizacji), ten sam silnik, własne teksty, przykłady i dalsze kroki. Mieszkaniec przy wyniku ma „Zobacz rozwiązanie” i „Oceń rozwiązanie”, instytucja „Dostosuj z Mostkiem”. Wynik zostaje po powrocie przyciskiem „wstecz”.
- Obok: „Co wiemy o tym problemie” - podobne zgłoszenia z MostIn (anonimowo), fakty z Mapy Wyzwań i fragment raportu ROPS ze stroną. To jest „wyszukuje podobne przypadki i informacje o kwestii” z zadania.
- Pod spodem: analiza opisu (Sonnet) → embedding → wyszukiwanie hybrydowe w Postgresie (0.65 znaczenie, 0.20 słowa kluczowe, 0.15 zgodność kategorii) → ocena i uzasadnienie (Opus) → serwer sprawdza, że model wskazał tylko innowacje z puli kandydatów.
- Decyzje:
  - Każda innowacja przy imporcie dostaje `search_text`, czyli opis językiem mieszkańca („babcia nie umie zadzwonić do wnuków przez wideo”). Embedding liczę z niego, nie z urzędowego opisu.
  - Wspólna taksonomia (18 obszarów, 16 grup) dla innowacji i zapytań, więc filtry trafiają.
  - Lepiej 2 trafne niż 5 naciąganych. Gdy katalog nie pokrywa problemu, system to mówi i prowadzi do Kreatora („nie ma rozwiązania, stwórz je”).
  - Supabase nie ma polskiego słownika, więc pełnotekstowe szuka po rdzeniach słów (`spastyczn:*`) i bez polskich znaków. Resztę odmiany łapią embeddingi.
- Strojenie na prawdziwym scenariuszu: „syn ma spastyczność rąk, nie stać mnie na rehabilitację” powinno dać Edki (kredki terapeutyczne). Na starcie 8. miejsce, po poprawkach (rdzenie słów, pula z obu rankingów, waga rzadkich słów użytkownika, drugie wyszukiwanie po dosłownych słowach) pierwsze. Scenariusze kontrolne (seniorzy, rodziny z Ukrainy) dalej działają.
- Rzadkie słowa (`lib/match/rare.ts`): ogólne słowa z pytania („innowacje”, „osoby”) pasują do dziesiątek opisów, a „spastyczność” jest tylko w opisie Edek. Do tego analiza AI potrafi przepisać „spastyczność” na „niepełnosprawność ruchową”. Dlatego słowa występujące w najwyżej 5 innowacjach bierzemy z oryginalnego tekstu, szukamy po nich osobno i dajemy premię zależną od rzadkości. Ten sam mechanizm działa w dopasowaniu, Mostku, triażu rozmów i Kreatorze. Test: 5 sformułowań ze spastycznością w 5 miejscach - Edki pierwsze (raz drugie, przy pomyśle wypożyczalni).

### II. Zasobnik wiedzy - Baza wiedzy
- **Biblioteka innowacji**: 115 innowacji, wyszukiwanie i filtry na żywo (obszar, dla kogo, etap). Wyszukiwanie po rdzeniach słów („dziecko” trafia w „dzieci”); gdy nic nie zawiera wszystkich słów, pokazuje innowacje pasujące do części. Tagi na stronie innowacji prowadzą do Biblioteki z tym filtrem.
- **Strona innowacji**: problem, rozwiązanie, wymagania, film (26 innowacji ma film), materiały, autorzy, nabór testów jeśli trwa, opinie testerów.
- **Mapa Wyzwań i raporty**: 8 obszarów, 51 wyzwań z linkiem do strony PDF, raporty ROPS. Mapa to dane ogólnopolskie, raporty małopolskie, Mostek to rozróżnia.
- **Materiały edukacyjne**: kanwa innowacji, wzór formularza, poradniki ROPS, wszystkie filmy.
- **Trendy potrzeb** (tylko ROPS): zgłoszenia po obszarach i tygodniach, popyt obok liczby innowacji w Bibliotece, „Sygnały dla Hubu” - gdzie potrzeb przybywa, a rozwiązań jest mało.
- Decyzje:
  - W bazie wiedzy Mostka jest 285 dokumentów (w tym 266 z paczek ZIP z dokumentacją modeli) i 7708 fragmentów z numerami stron. PDF-ów nie kopiuję - trzymam link do źródła ROPS i fragmenty, więc wersja jest zawsze aktualna.
  - Synchronizacja z Biblioteką ROPS liczy skrót treści (SHA-256) i przez AI przepuszcza tylko nowe i zmienione innowacje. Pełny import ok. 3 USD, kolejne grosze.
  - Dokumentacja modelu jest przypięta do swojej innowacji, więc pytanie o konkretną innowację przeszukuje tylko jej dokumenty.

### III. Kreator pomysłów
- **Fiszka pomysłu**, zawsze otwarta. Na start dwa pola (problem i pomysł), reszta kanwy (Social Innovation Canvas ROPS / INNO AGH) opcjonalnie, z opcjami do zaznaczenia.
- **Ocena Mostka**: czy pomysł nie powiela innowacji już inkubowanych (wymóg naboru) - „unikalny / częściowo podobny / powiela” z najbliższymi innowacjami, do tego mocne strony, luki z pytaniami, usprawnienia, następny krok i 1-3 obszary.
- **Obraz pomysłu**: własne zdjęcie lub szkic (do 5 MB) albo ilustracja AI z własnego opisu.
- **Wyślij do ROPS** jednym kliknięciem - rozmowa w skrzynce ROPS z pełną kanwą.
- **Generator wniosku** - tylko gdy trwa nabór z formularzem (dziś „Inkubator Włączenia Społecznego 2.0”, 10 sekcji według prawdziwego wzoru). Diagnoza bierze dane z raportów ROPS i Mapy Wyzwań. Kwot i zespołu nie wymyśla, wstawia [DO UZUPEŁNIENIA]. Szkic do pobrania jako .docx i .odt, do skopiowania albo druku.
- Decyzje:
  - Sekcje 2 (dane pomysłodawcy) i 12 (oświadczenia) świadomie bez AI: dane osobowe i odpowiedzialność karna.
  - Cały wniosek w jednym wywołaniu to ok. 40 s, a Netlify ucina po 30 s. Przeglądarka wysyła 6 równoległych żądań po 1-3 sekcje i sekcje pojawiają się po kolei.
  - .docx i .odt składam w przeglądarce (to zipy z XML-em), bez dużych bibliotek.
  - Gdy ROPS ogłasza nabór z obszarami, autorzy fiszek z tych obszarów dostają wiadomość (raz na nabór).

### IV. Tester innowacji - „Testuj”
- Lista testów z „Zgłoś się do testu” albo „Powiadom mnie o starcie”. Ten sam przycisk jest na stronie innowacji, jeśli trwa nabór.
- Profil potrzeb (obszary, pseudonim, zgody): przy pierwszym zgłoszeniu krótki formularz z obszarami testu już zaznaczonymi, potem zgłoszenie jednym kliknięciem. Edycja w „Mój profil”.
- Lista oczekujących: kiedy ROPS otwiera test, osoby z pasującym profilem i zgodą dostają zaproszenie.
- Ocena innowacji (1-5), „co działa”, propozycja usprawnienia. ROPS widzi to w „Opiniach z testów”.

### V. Platforma aktywnej komunikacji - Rozmowy z ROPS, Panel mentora
- „Napisz do ROPS”: pytanie, prośba o eksperta, partnerstwo, pomysł, testy. Bez konta. Potwierdzenie od razu, odpowiedź w tym samym wątku. Mostek może przekazać sprawę z gotowym podsumowaniem.
- Po stronie ROPS: powiadomienie, triaż AI w tle (kategoria, priorytet, streszczenie, szkic odpowiedzi z pasującymi innowacjami), pilne na górze, średni czas pierwszej odpowiedzi.
- **Panel mentora** dla ekspertów: tylko prośby o mentora i partnerstwa, odpowiedź idzie do rozmowy autora jako „Mentor”.
- Decyzje:
  - Odpowiedź zawsze zatwierdza człowiek. Szkicu z niewypełnionym [DO UZUPEŁNIENIA] nie da się wysłać.
  - Triaż rusza po odpowiedzi do użytkownika (`after()`), więc nikt nie czeka na AI.
- To moja odpowiedź na kryterium „szybkość komunikacji”: ROPS dostaje powiadomienie i uporządkowaną sprawę, autor widzi odpowiedź u siebie.

### VI. Panel administratora (ROPS)
- Pulpit „Do zrobienia”: rozmowy do odpowiedzi (z pilnymi), gminy czekające na kontakt, zgłoszenia z Przęseł, nowe pomysły. Niżej stan Hubu i koszt AI w miesiącu z paskiem budżetu.
- CMS: jedna definicja typu treści daje listę, filtry, sortowanie, formularz i zapis. Urzędnik nie widzi JSON-a - materiały, fakty i zasady naboru edytuje polami, innowację wybiera wyszukiwaniem po nazwie.
- „Przetwórz AI” przy innowacji i dokumencie, synchronizacja z Biblioteką ROPS.
- Leady gmin, Rozmowy, Pomysły (karta pomysłu, zmiana etapu), Trendy, Zgłoszenia z Przęseł, Opinie z testów, Ustawienia AI, Moje konto.

### VII. Middleman Innowacji - „Dostosuj z Mostkiem”
- Formularz: typ instytucji, miejscowość, odbiorcy, ludzie, budżet, czas, ograniczenia. Wynik: wykonalność 0-100, tabela „w oryginale / u Ciebie”, etapy z rolami, budżet orientacyjny, partnerzy, ryzyka, wskaźniki, pierwszy tydzień i założenia do sprawdzenia.
- Wejście z wyników dopasowania w ścieżkach gmin i organizacji oraz z przycisku Mostka.
- Formularz z polami do wyboru: szybki, działa z klawiatury i czytnikiem ekranu, nie wymaga prowadzenia rozmowy. Plan generuję w dwóch równoległych częściach, żeby zmieścić się w limicie hostingu.

### Strefa JST - dla gmin (wskazanie ROPS)
- Radar naborów z odliczaniem dni, kwotą i warunkami - każda liczba z cytatem strony regulaminu. Termin w demo jest oznaczony jako przykładowy.
- Termin do kalendarza: Google, Outlook albo plik .ics z przypomnieniami.
- Test kwalifikacji w 60 sekund (4 pytania tylko z faktów regulaminu) i przedwstępny wniosek, który od razu trafia do ROPS.
- Asystent grantowy: Mostek przeprowadza przez regulamin „Usługi Wrażliwej” i dokumentację modeli, porównuje wymagania z zasobami gminy i podpowiada, jak uzupełnić braki.
- Kontakt zbieram na starcie, więc ROPS ma leada z podsumowaniem AI (gotowość, bariery, następny krok), nawet jeśli gmina przerwie.
- Kluczowe fakty naboru są w `lib/jst/facts.ts` z dosłownym cytatem, a `pnpm verify:facts` sprawdza, czy cytat jest w dokumencie. Test na liczbach pokazał, że Mostek przeoczył „wkład własny nie jest wymagany”. Po poprawce podaje to z cytatem.

### Przęsła - kręgi wsparcia
- Osoby w podobnej sytuacji rozmawiają pod pseudonimem. Mostek podaje anonimową liczbę („12 osób w Małopolsce, 3 w okolicy”) i prowadzi do pasującego kręgu.
- Rozmowa jest swobodna, ale obelgi, groźby i nienawiść są blokowane. Dane kontaktowe w grupie są ukrywane, kontakt prywatny tylko za zgodą obu stron.
- ROPS nie czyta rozmów. Widzi tylko wiadomości zgłoszone przez uczestników i może je ukryć, przywrócić albo uznać zgłoszenie za bezzasadne.
- Przy treściach o kryzysie wiadomość nie jest blokowana, tylko pod nią pokazuję telefony zaufania (sprawdzone na gov.pl).

### Mostek - asystent nad całym serwisem
- Czat w rogu każdej strony (Alt+M) i pełny ekran `/mostek`. Wie, na jakiej stronie i ścieżce jest użytkownik, więc nie pyta „kim jesteś”.
- Narzędzia: wyszukiwanie innowacji, szczegóły innowacji, raporty i dokumentacja modeli, Mapa Wyzwań, nabory, Przęsła, przyciski następnego kroku. W panelu ROPS dodatkowo koszty AI.
- Każda informacja z cytatem i listą źródeł z linkiem do strony PDF.
- Tryb głosowy (mów i słuchaj) dla osób, którym trudno pisać lub czytać. ROPS włącza go per podstrona i wybiera głos.
- Decyzje:
  - Historia rozmowy jest na serwerze i tylko dopisywana. Opus odrzuca historię z wyciętymi wywołaniami narzędzi, więc klient wysyła tylko nową wiadomość.
  - Cache całej rozmowy: każdy krok i każde kolejne pytanie czyta dotychczasową historię z cache (Opus: 0,20 zamiast 4 USD za 1M tokenów). Zmierzone: pierwsza odpowiedź 0,08 USD zamiast 0,14, druga w tej samej rozmowie 0,015 zamiast 0,10.
  - Narzędzia tylko czytają. Jedyne „działanie” to przycisk, który klika człowiek, i może on wskazać tylko innowację albo krąg, które Mostek naprawdę dostał z narzędzia w tej rozmowie.

## 3. AI pod kontrolą ROPS

- Przełączniki w panelu: tylko dozwolone źródła, tylko polityka społeczna, bez porad medycznych, prawnych, polityki i religii, własne tematy wyłączone, blokada wulgaryzmów i obelg, maskowanie danych osobowych. Zmiana działa po kilkunastu sekundach, bez wdrożenia.
- Cztery warstwy: filtr słownikowy (od razu i za darmo) → moderacja OpenAI → zasady w prompcie (treść dokumentów to dane, nie polecenia, czyli ochrona przed prompt injection) → sprawdzenie odpowiedzi (identyfikatory innowacji, wulgaryzmy).
- Ton Mostka z 6 archetypów marki (Opiekun, Mędrzec, Towarzysz, Przewodnik, Twórca, Bohater). ROPS wybiera kliknięciem, nie pisze promptów. Ton nigdy nie zmienia zakresu merytorycznego.
- „Prosty język” z paska dostępności zmienia wszystkie odpowiedzi AI dla mieszkańców (czat, uzasadnienia, ocena w Kreatorze, plan wdrożenia). Szkic wniosku zostaje formalny.
- Dziennik automatycznej moderacji po polsku: co, gdzie i dlaczego zablokowano, bez danych osobowych.
- Budżet miesięczny, próg alertu, dzienne limity na osobę (zapytania, obrazy, minuty głosu). Po przekroczeniu tryb oszczędny albo zatrzymanie. Tryb oszczędny: wszystkie funkcje odpowiadają Sonnetem 5.5 zamiast Opusa (ok. połowa ceny), bez ilustracji i głosu.
- Tryb głosowy włączany per podstrona, lista pogrupowana jak menu serwisu. Domyślnie włączony dla mieszkańców i w Bazie wiedzy, wyłączony w narzędziach dla instytucji i w panelach.

## 4. Bezpieczeństwo i prywatność

- **RLS na każdej tabeli.** Wiedza publiczna do odczytu, zapis tylko dla administratora. CMS zapisuje treści przez sesję administratora, więc uprawnienia pilnuje sama baza.
- **Klucz serwisowy tylko na serwerze.** Skrzynki ROPS, rozmowy, Przęsła i trasy AI korzystają z niego wyłącznie w kodzie serwerowym (`server-only`) i dopiero po sprawdzeniu uprawnień: rola administratora albo klucz sesji z ciasteczka. Przeglądarka nigdy go nie dostaje.
- **Dane kontaktowe w osobnych tabelach.** Nigdy nie trafiają do AI, widzi je tylko ROPS.
- **Maskowanie danych osobowych** (PESEL, telefon, e-mail, numer konta), zanim tekst trafi do AI i do bazy.
- **Nie pytam o niepełnosprawność ani diagnozy.** Do dopasowania wystarczą obszary potrzeb.
- **Bez konta**: anonimowa sesja z kluczem w ciasteczku httpOnly. Profil potrzeb i lead gminy są przypięte do sesji.
- **Persona administratora tylko w trybie demo** (`DEMO_MODE=true`). Tryb panelu w Mostku sprawdzam na serwerze rolą administratora, a narzędzie kosztów odmawia poza tym trybem.
- **Pliki od użytkowników**: typ sprawdzany po zawartości pliku, limit rozmiaru i dzienny, moderacja obrazu przed zapisem, zapis przez serwer (kosz w Storage przyjmuje zapis tylko od administratora).
- **Nagrania głosu** nie są zapisywane, idą tylko do rozpoznania mowy.
- **Bez analityki i śledzenia.** Tylko ciasteczka niezbędne (sesja, ustawienia dostępności), więc baner zgód nie jest potrzebny.
- **Dane osób w demo są syntetyczne.** Innowacje, dokumenty i Mapa Wyzwań pochodzą z publicznych źródeł ROPS (Biblioteka Innowacji na licencji CC BY 4.0, źródło przy każdej pozycji).

## 5. Dostępność (WCAG 2.1 AA)

- Krój Atkinson Hyperlegible (Braille Institute, z myślą o osobach słabowidzących).
- Pasek dostępności na każdej stronie: tekst 100 / 125 / 150%, wysoki kontrast, prosty język (zmienia odpowiedzi AI), bez animacji (wyłącza też płynne przewijanie). Ustawienia zapamiętane i nakładane przed pierwszym renderem.
- Kolory marki sprawdzone pod kontrast: przyciski `#c2410c` z białym tekstem, linki w tekście `#a83b18` z podkreśleniem, czysty pomarańcz `#e85d2a` tylko tam, gdzie wystarcza 3:1 (grafika, fokus).
- Klawiatura wszędzie, widoczny fokus, „Przejdź do treści”, landmarki, okruszki, etykiety pól, komunikaty dla czytnika, statusy zawsze tekstem.
- Formularze z opcjami do zaznaczenia zamiast pustych pól, z myślą o seniorach.
- **Test axe-core (WCAG 2.0 / 2.1 A i AA): 0 naruszeń na 16 stronach publicznych i 6 w widoku telefonu.** Przed poprawkami były 4 rodzaje problemów (kontrast „In” w haśle, link w grupie zakładek, linki odróżnione tylko kolorem, lista w makiecie konta).
- Uczciwie: to test automatyczny. Pełny audyt (klawiatura, NVDA, panel ROPS) jeszcze przede mną. PDF-y ROPS i filmy na YouTube są poza moją kontrolą.

## 6. Interfejs

- **Styl serwisu publicznego.** Ostre krawędzie, linie i numerowane listy 01 / 02 / 03, w duchu gov.pl i biznes.gov.pl. Prosty układ pozostaje czytelny przy powiększonym tekście i w wysokim kontraście.
- **Jedno główne działanie na ekranie**, duży nagłówek, krótki wstęp.
- **Zakładki odbiorców**: Dla Mieszkańców (wielka litera celowo), Dla gmin i instytucji, Dla organizacji i innowatorów, Baza wiedzy. Okruszki na każdej podstronie.
- **Nagłówek chowa się przy przewijaniu w dół** i wraca przy ruchu w górę.
- **Telefon**: menu ☰, czat na cały ekran, okno czatu dopasowane do klawiatury ekranowej.
- **Kadry z filmów ROPS** o innowacjach na stronie głównej.
- **Czekanie na AI jest widoczne**: w czacie i Kreatorze etapy („Szukam podobnych rozwiązań…”), licznik sekund i typowy czas. Każdy przycisk wysyłający pokazuje, że akcja trwa.
- **Wszystko, co jest pokazem, ma ramkę DEMO** (przykładowe pytania, logowanie e-mailem, ustawienia konta), żeby było jasne, co jest demo, a co usługą.

## 7. Demo

- **Przełącznik DEMO** nad nagłówkiem: Niezalogowany / Mieszkanka Anna / Mentor (dr Marek) / Koordynatorka ROPS. Bez kont i haseł, na anonimowych sesjach z rolą nadaną na serwerze.
- **Anna** opiekuje się mamą po udarze, ma profil potrzeb i krąg w Przęsłach. **dr Marek** ma Panel mentora z trzema sprawami. **Koordynatorka** widzi pełny panel z przykładowymi leadami, wnioskami, rozmowami, zgłoszeniami i opiniami.
- **Logowanie i rejestracja** w demo to podgląd, a „zarejestruj się automatycznie jako mieszkaniec / specjalista” wpuszcza jako przykładowa osoba. W wersji docelowej logowanie e-mailem.
- Dane przykładowe: `pnpm seed:demo` i `pnpm seed:demo-extra` (można puszczać wiele razy).
- W stopce: „Prototyp konkursowy HackYeah 2026 (zadanie ROPS Kraków), nie jest oficjalnym serwisem ROPS”. Bez logo ROPS - znak instytucji wymaga zgody, a obok są dane kontaktowe ROPS, więc ktoś mógłby wziąć prototyp za oficjalną usługę. Źródło danych podane tekstem (CC BY 4.0). Cały serwis ma `noindex` - prototyp nie trafia do wyszukiwarek.
- Makiety UX/UI (`/makiety`) to zrzuty z działającej aplikacji, z opisem decyzji przy każdym ekranie.

## 8. Koszty i utrzymanie

- Infrastruktura: Supabase Pro ok. 25 USD / mies., Netlify Pro ok. 19 USD / mies.
- AI, zmierzone na prototypie: dopasowanie ok. 0,06 USD, odpowiedź Mostka ok. 0,08 USD (kolejne w tej samej rozmowie 0,015-0,03 USD), plan wdrożenia ok. 0,10 USD, ocena pomysłu ok. 0,04 USD, ilustracja ok. 0,01 USD, triaż sprawy ok. 0,01 USD, szkic wniosku 0,5-0,8 USD.
- Głos: rozpoznawanie ok. 0,003 USD / min, czytanie ok. 0,015 USD / min. 1000 rozmów głosowych (2 min mówienia + 3 min słuchania) to ok. 51 USD / mies.
- Przykład dla regionu: 500 dopasowań, 1000 rozmów z Mostkiem, 50 planów i 20 wniosków miesięcznie to ok. 130-170 USD / mies. za AI, w trybie oszczędnym ok. połowa. Budżet i limity ustawia ROPS.
- Każde wywołanie AI zapisuje tokeny i koszt, z modelem, który faktycznie odpowiedział (także model zapasowy przy odmowie) i zapisem do cache. W panelu tabela kosztów według modeli, na pulpicie koszt miesiąca, a Mostek w panelu odpowiada na „ile wydaliśmy na AI”. Sprawdzone z rachunkiem Anthropic: Opus 3.10 - 7,53 USD w dzienniku, 7,54 USD w konsoli.
- Treści: synchronizacja z Biblioteką ROPS (docelowo raz dziennie), CMS dla pracowników, import PDF jednym kliknięciem.

## 9. Zgodność z zadaniem

| Wymaganie | Gdzie w MostIn |
|---|---|
| I. Matchmaking społeczny (obowiązkowy) | „Znajdź rozwiązanie”, Mostek, „Co wiemy o tym problemie” |
| II. Zasobnik wiedzy, trendy tylko dla administratora | Biblioteka, Mapa wyzwań i raporty, Materiały edukacyjne, Trendy potrzeb |
| III. Kreator: fiszka zawsze, generator w naborze, kanwa, asystent, wizualizacja | Fiszka, ocena Mostka, obraz pomysłu, generator wniosku IWS 2.0 |
| IV. Tester innowacji | Testuj: zgłoszenia, lista oczekujących, oceny i usprawnienia |
| V. Platforma aktywnej komunikacji, mentorzy, partnerstwa | Rozmowy z ROPS, triaż, Panel mentora, Przęsła |
| VI. Panel administratora | Panel ROPS: CMS, synchronizacja, skrzynki, trendy, ustawienia AI |
| VII. Middleman Innowacji | „Dostosuj z Mostkiem” |
| Powiadomienia o pomysłach i naborach | Powiadomienia dla ROPS o nowych sprawach i pomysłach, wiadomość do autorów fiszek przy nowym naborze |
| WCAG 2.1 AA | Pasek dostępności, 0 naruszeń axe na 16 stronach |
| Bez prawdziwych danych osobowych | Osoby w demo są syntetyczne |

## 10. Czego jeszcze nie ma

- Powiadomienia e-mail i SMS (dziś w serwisie, kolumna preferowanego kontaktu już jest).
- Automatyczna synchronizacja z harmonogramu (dziś przycisk w panelu).
- Długie zadania AI w Supabase Edge Functions zamiast funkcji Netlify.
- Pełny audyt WCAG z czytnikiem ekranu, także panelu ROPS.
- Integracja z bazą grantową ROPS i prawdziwe logowanie e-mailem.

## 11. Trudne pytania jury

- **Czy AI nie zmyśla innowacji?** Nie może. Wybiera tylko spośród kandydatów z bazy, serwer sprawdza każde ID, każda karta ma link do źródła ROPS.
- **A liczby w naborach?** Tylko z regulaminu, z dosłownym cytatem i automatycznym sprawdzeniem (`pnpm verify:facts`). Czego nie ma w źródle, Mostek nie podaje.
- **Co, jeśli ROPS zmieni treści na stronie?** Synchronizacja po skrócie treści wykrywa zmiany i przetwarza tylko je.
- **Ile to kosztuje?** Ok. 130-170 USD / mies. za AI dla regionu (w trybie oszczędnym ok. połowa) plus ok. 45 USD infrastruktury. Budżet i limity ustawia ROPS.
- **Da się go zmusić do przeklinania albo polityki?** Cztery warstwy, przełączniki ROPS i dziennik zdarzeń.
- **Czym MostIn różni się od asystenta czatowego?** Matchmaking działa na uporządkowanej wiedzy, a Mostek prowadzi do działania (zgłoszenie, fiszka, plan, krąg, rozmowa z ROPS), które zawsze zatwierdza człowiek.
- **ROPS mówi o ok. 200 innowacjach, a tu jest 115?** Publiczna Biblioteka ROPS ma dokładnie 115 opisanych innowacji i wszystkie są w MostIn. Pozostałe są tylko w publikacjach - CMS i importer pozwalają je dodać bez zmian w kodzie.
- **Czy to spełnia WCAG?** Projektowane pod WCAG 2.1 AA, 0 naruszeń w automatycznym teście axe na 16 stronach. Pełny audyt z czytnikiem w planach.

## 12. AI przy budowie

Kod pisałem z asystentem Claude Code. Część danych (struktura 46 innowacji, Mapa Wyzwań) przygotowałem ekstrakcją offline z tym samym schematem walidacji co produkcyjny import. Architektura jest opisana w `ARCHITECTURE.md`.
