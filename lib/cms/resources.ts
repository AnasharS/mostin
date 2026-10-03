// Deklaratywna konfiguracja CMS - jedna definicja = lista, formularz, zapis.
// Dodanie nowego typu treści to dopisanie obiektu tutaj (i tabeli w migracji).

import { CATEGORIES, TARGET_GROUPS } from "@/lib/ai/taxonomy"

export type FieldType =
  | "text" | "textarea" | "number" | "date" | "url" | "boolean"
  | "select" | "tags" | "multiselect" | "area" | "areas" | "file"
  | "innovation"                 // wybór innowacji przez wyszukiwanie po nazwie (zapisuje ID)
  | "structured"                 // lista lub obiekt edytowany polami zamiast JSON-a (zapisuje JSON)

/** Pole w wierszu listy albo w obiekcie pola strukturalnego. */
export type SubField = {
  key: string
  label: string
  type: "text" | "url" | "number" | "textarea" | "select" | "lines" | "list"
  options?: [string, string][]   // select: [wartość, etykieta]
  placeholder?: string
  items?: SubField[]             // list
  addLabel?: string              // list
}
export type StructuredSchema =
  | { kind: "list"; items: SubField[]; addLabel: string }
  | { kind: "object"; props: SubField[] }

export type Field = {
  name: string
  label: string
  type: FieldType
  required?: boolean
  help?: string
  options?: readonly string[]   // select / multiselect
  bucket?: string               // file
  accept?: string               // file
  readOnly?: boolean            // pola uzupełniane przez AI - edytowalne, ale opisane
  aiFilled?: boolean
  schema?: StructuredSchema     // structured
}

export type Resource = {
  slug: string                  // segment URL w /admin
  table: string
  label: string                 // liczba mnoga
  singular: string
  description: string
  listColumns: { name: string; label: string }[]
  searchColumn: string
  orderBy: string
  fields: Field[]
  ingest?: "innovation" | "document"
  /** dodatkowe filtry listy (select - jedna wartość, array - zawiera wartość, boolean - tak/nie) */
  filters?: { name: string; label: string; kind: "select" | "array" | "boolean"; options?: readonly string[]; yes?: string; no?: string }[]
  /** sortowania listy; pierwsze jest domyślne */
  sorts?: { id: string; label: string; column: string; asc?: boolean }[]
}

export const RESOURCES: Resource[] = [
  {
    slug: "innowacje",
    table: "innovations",
    label: "Innowacje",
    singular: "innowację",
    description: "Biblioteka Innowacji Społecznych - źródło dla matchmakingu. Po zapisaniu kliknij „Przetwórz AI”, aby uzupełnić strukturę i embedding.",
    listColumns: [
      { name: "title", label: "Tytuł" },
      { name: "stage", label: "Etap" },
      { name: "ingest_status", label: "AI" },
      { name: "published", label: "Publiczna" },
    ],
    searchColumn: "title",
    orderBy: "created_at",
    ingest: "innovation",
    filters: [
      { name: "stage", label: "Etap", kind: "select", options: ["pomysl", "prototyp", "testowana", "wdrozona", "upowszechniana"] },
      { name: "categories", label: "Obszar", kind: "array", options: CATEGORIES },
      { name: "published", label: "Widoczność", kind: "boolean", yes: "Opublikowane", no: "Ukryte" },
    ],
    sorts: [
      { id: "nowe", label: "Najnowsze", column: "created_at" },
      { id: "stare", label: "Najstarsze", column: "created_at", asc: true },
      { id: "az", label: "Nazwa A-Z", column: "title", asc: true },
      { id: "ai", label: "Ostatnio przetworzone przez AI", column: "ingested_at" },
      { id: "zmienione", label: "Ostatnio zmienione", column: "updated_at" },
    ],
    fields: [
      { name: "title", label: "Tytuł", type: "text", required: true },
      { name: "summary", label: "Krótki opis", type: "textarea", required: true, help: "1-3 zdania. AI uzupełni, jeśli zostawisz krótko." },
      { name: "description", label: "Pełny opis", type: "textarea", help: "Wklej dowolny opis - AI wyciągnie z niego strukturę." },
      { name: "author_org", label: "Autor / organizacja", type: "text" },
      { name: "contact", label: "Kontakt", type: "text" },
      { name: "source_label", label: "Źródło (nazwa)", type: "text" },
      { name: "source_url", label: "Źródło (link)", type: "url" },
      { name: "media", label: "Materiały i multimedia", type: "structured", help: "Film, folder PDF, paczka do pobrania albo obraz - z linkiem i krótkim opisem.",
        schema: { kind: "list", addLabel: "Dodaj materiał", items: [
          { key: "type", label: "Rodzaj", type: "select", options: [["video", "Film (YouTube)"], ["pdf", "Dokument PDF"], ["zip", "Paczka do pobrania (ZIP)"], ["image", "Obraz"]] },
          { key: "url", label: "Link", type: "url", placeholder: "https://…" },
          { key: "title", label: "Opis", type: "text", placeholder: "np. Folder innowacji" },
        ] } },
      { name: "published", label: "Opublikowana", type: "boolean" },
      { name: "is_sample", label: "Dane przykładowe", type: "boolean", help: "Oznaczane w interfejsie jako przykład." },
      { name: "problem", label: "Problem", type: "textarea", aiFilled: true },
      { name: "solution", label: "Rozwiązanie", type: "textarea", aiFilled: true },
      { name: "needs", label: "Potrzeby", type: "tags", aiFilled: true },
      { name: "categories", label: "Kategorie", type: "multiselect", options: CATEGORIES, aiFilled: true },
      { name: "target_groups", label: "Grupy docelowe", type: "multiselect", options: TARGET_GROUPS, aiFilled: true },
      { name: "location", label: "Lokalizacja", type: "text", aiFilled: true },
      { name: "stage", label: "Etap", type: "select", options: ["pomysl", "prototyp", "testowana", "wdrozona", "upowszechniana"], aiFilled: true },
      { name: "implementation_requirements", label: "Wymagania wdrożeniowe", type: "textarea", aiFilled: true },
      { name: "resources", label: "Zasoby i koszty", type: "textarea", aiFilled: true },
    ],
  },
  {
    slug: "dokumenty",
    table: "documents",
    label: "Dokumenty",
    singular: "dokument",
    description: "Raporty ROPS, Mapa Wyzwań, regulaminy naborów - baza wiedzy dla Mostka (RAG). Po wgraniu PDF kliknij „Przetwórz AI”, aby podzielić go na fragmenty ze stronami.",
    listColumns: [
      { name: "title", label: "Tytuł" },
      { name: "kind", label: "Rodzaj" },
      { name: "page_count", label: "Strony" },
      { name: "ingest_status", label: "AI" },
    ],
    searchColumn: "title",
    orderBy: "created_at",
    ingest: "document",
    fields: [
      { name: "title", label: "Tytuł", type: "text", required: true },
      { name: "kind", label: "Rodzaj", type: "select", options: ["report", "regulation", "challenge_map", "guide", "call_rules", "innovation_model", "other"], required: true },
      { name: "description", label: "Opis", type: "textarea" },
      { name: "storage_path", label: "Plik PDF", type: "file", bucket: "documents", accept: "application/pdf" },
      { name: "source_url", label: "Link do źródła", type: "url" },
      { name: "published_on", label: "Data publikacji", type: "date" },
      { name: "area_ids", label: "Obszary", type: "areas" },
      { name: "is_sample", label: "Dane przykładowe", type: "boolean" },
    ],
  },
  {
    slug: "wyzwania",
    table: "challenges",
    label: "Wyzwania",
    singular: "wyzwanie",
    description: "Mapa Wyzwań Społecznych Małopolski - wyzwania z danymi i źródłem.",
    listColumns: [{ name: "title", label: "Tytuł" }, { name: "updated_at", label: "Aktualizacja" }],
    searchColumn: "title",
    orderBy: "updated_at",
    fields: [
      { name: "title", label: "Tytuł", type: "text", required: true },
      { name: "summary", label: "Opis", type: "textarea", required: true },
      { name: "area_id", label: "Obszar", type: "area" },
      { name: "indicators", label: "Fakty i wskaźniki", type: "structured", help: "Fakt z dokumentu źródłowego i numer strony - Mostek cytuje je ze stroną.",
        schema: { kind: "list", addLabel: "Dodaj fakt", items: [
          { key: "fakt", label: "Fakt", type: "textarea" },
          { key: "strona", label: "Strona", type: "number" },
        ] } },
      { name: "source_label", label: "Źródło (nazwa)", type: "text" },
      { name: "source_url", label: "Źródło (link)", type: "url" },
      { name: "is_sample", label: "Dane przykładowe", type: "boolean" },
    ],
  },
  {
    slug: "materialy",
    table: "materials",
    label: "Materiały edukacyjne",
    singular: "materiał",
    description: "Poradniki, kanwy innowacji, filmy i kursy.",
    listColumns: [{ name: "title", label: "Tytuł" }, { name: "kind", label: "Rodzaj" }],
    searchColumn: "title",
    orderBy: "created_at",
    fields: [
      { name: "title", label: "Tytuł", type: "text", required: true },
      { name: "kind", label: "Rodzaj", type: "select", options: ["guide", "canvas", "video", "report", "course"], required: true },
      { name: "summary", label: "Opis", type: "textarea" },
      { name: "url", label: "Link", type: "url" },
      { name: "area_ids", label: "Obszary", type: "areas" },
      { name: "is_sample", label: "Dane przykładowe", type: "boolean" },
    ],
  },
  {
    slug: "nabory",
    table: "calls",
    label: "Nabory grantowe",
    singular: "nabór",
    description: "Aktywne nabory - Kreator dopasowuje do nich generator wniosków. Zapis aktywnego naboru z kategoriami powiadamia autorów pomysłów z tych obszarów.",
    listColumns: [{ name: "title", label: "Tytuł" }, { name: "closes_at", label: "Do" }, { name: "active", label: "Aktywny" }],
    searchColumn: "title",
    orderBy: "closes_at",
    fields: [
      { name: "title", label: "Tytuł", type: "text", required: true },
      { name: "description", label: "Opis", type: "textarea" },
      { name: "categories", label: "Obszary naboru (powiadomienia dla autorów pomysłów)", type: "multiselect", options: CATEGORIES },
      { name: "audience", label: "Dla kogo (radar naborów)", type: "multiselect", options: ["wszyscy", "jst", "organizacje", "mieszkancy"] },
      { name: "amount_label", label: "Kwota (np. „do 600 000 zł”)", type: "text", help: "Tylko z potwierdzonego źródła ROPS." },
      { name: "amount_source", label: "Źródło kwoty (dokument, strona)", type: "text" },
      { name: "source_url", label: "Link do ogłoszenia", type: "url" },
      { name: "eligibility_check", label: "Test kwalifikacji", type: "select", options: ["usluga_wrazliwa"] },
      { name: "rules", label: "Zasady naboru", type: "structured", help: "Wykorzystuje je generator wniosku w Kreatorze. Sekcje wniosku według wzoru formularza.",
        schema: { kind: "object", props: [
          { key: "program", label: "Program / działanie", type: "text", placeholder: "np. FERS 2021-2027, Działanie 5.1" },
          { key: "wymogi", label: "Wymogi naboru", type: "lines" },
          { key: "okres_przygotowawczy_max_mies", label: "Okres przygotowawczy - maks. miesięcy", type: "number" },
          { key: "okres_testowania_max_mies", label: "Testowanie - maks. miesięcy", type: "number" },
          { key: "fazy_testu", label: "Fazy testu", type: "lines" },
          { key: "sekcje_wniosku", label: "Sekcje wniosku (wzór formularza)", type: "list", addLabel: "Dodaj sekcję", items: [
            { key: "nr", label: "Nr", type: "number" },
            { key: "tytul", label: "Tytuł sekcji", type: "text" },
            { key: "pomoc", label: "Podpowiedź dla piszącego", type: "textarea" },
          ] },
          { key: "sekcje_poza_ai", label: "Sekcje wypełniane tylko ręcznie (bez AI)", type: "lines" },
        ] } },
      { name: "opens_at", label: "Otwarcie", type: "date" },
      { name: "closes_at", label: "Zamknięcie", type: "date" },
      { name: "active", label: "Aktywny", type: "boolean" },
      { name: "is_sample", label: "Dane przykładowe", type: "boolean" },
    ],
  },
  {
    slug: "aktualnosci",
    table: "news",
    label: "Aktualności",
    singular: "aktualność",
    description: "Wiadomości na portalu: nabory, wyniki, wydarzenia. Odbiorcy decydują, gdzie się wyświetlają (np. tylko w Strefie JST).",
    listColumns: [{ name: "title", label: "Tytuł" }, { name: "kind", label: "Rodzaj" }, { name: "published_at", label: "Data" }],
    searchColumn: "title",
    orderBy: "published_at",
    fields: [
      { name: "title", label: "Tytuł", type: "text", required: true },
      { name: "lead", label: "Zajawka (1-2 zdania)", type: "textarea", required: true },
      { name: "body", label: "Treść", type: "textarea" },
      { name: "kind", label: "Rodzaj", type: "select", options: ["nabor", "wyniki", "wydarzenie", "innowacja", "informacja"], required: true },
      { name: "audience", label: "Odbiorcy", type: "multiselect", options: ["wszyscy", "jst", "organizacje", "mieszkancy"] },
      { name: "call_id", label: "ID powiązanego naboru (opcjonalnie)", type: "number" },
      { name: "source_url", label: "Źródło (link)", type: "url" },
      { name: "pinned", label: "Przypięta na górze", type: "boolean" },
      { name: "is_sample", label: "Dane przykładowe", type: "boolean" },
    ],
  },
  {
    slug: "testy",
    table: "tests",
    label: "Testy innowacji",
    singular: "test",
    description: "Nabory testerów. Zmiana statusu na „open” automatycznie dopasowuje listę oczekujących (kategorie i grupy) i wysyła zaproszenia.",
    listColumns: [{ name: "title", label: "Tytuł" }, { name: "status", label: "Status" }, { name: "closes_at", label: "Do" }, { name: "slots", label: "Miejsca" }],
    searchColumn: "title",
    orderBy: "created_at",
    fields: [
      { name: "innovation_id", label: "Innowacja", type: "innovation", required: true, help: "Wyszukaj po nazwie z Biblioteki innowacji." },
      { name: "title", label: "Tytuł", type: "text", required: true },
      { name: "description", label: "Opis", type: "textarea" },
      { name: "status", label: "Status", type: "select", options: ["planned", "open", "closed"], required: true, help: "„Nabór otwarty” wysyła zaproszenia do pasujących osób z listy oczekujących." },
      { name: "categories", label: "Kategorie (do dopasowania listy oczekujących)", type: "multiselect", options: CATEGORIES },
      { name: "target_groups", label: "Grupy docelowe", type: "multiselect", options: TARGET_GROUPS },
      { name: "location", label: "Miejsce", type: "text" },
      { name: "slots", label: "Liczba miejsc", type: "number" },
      { name: "opens_at", label: "Otwarcie", type: "date" },
      { name: "closes_at", label: "Zamknięcie", type: "date" },
    ],
  },
  {
    slug: "obszary",
    table: "areas",
    label: "Obszary",
    singular: "obszar",
    description: "Słownik obszarów wyzwań społecznych.",
    listColumns: [{ name: "name", label: "Nazwa" }, { name: "slug", label: "Slug" }],
    searchColumn: "name",
    orderBy: "id",
    fields: [
      { name: "name", label: "Nazwa", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", required: true },
      { name: "description", label: "Opis", type: "textarea" },
    ],
  },
]

export const getResource = (slug: string) => RESOURCES.find((r) => r.slug === slug)
