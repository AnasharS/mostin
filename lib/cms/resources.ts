// Deklaratywna konfiguracja CMS - jedna definicja = lista, formularz, zapis.
// Dodanie nowego typu treści to dopisanie obiektu tutaj (i tabeli w migracji).

import { CATEGORIES, TARGET_GROUPS } from "@/lib/ai/taxonomy"

export type FieldType =
  | "text" | "textarea" | "number" | "date" | "url" | "boolean"
  | "select" | "tags" | "multiselect" | "area" | "areas" | "file"

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
    fields: [
      { name: "title", label: "Tytuł", type: "text", required: true },
      { name: "summary", label: "Krótki opis", type: "textarea", required: true, help: "1-3 zdania. AI uzupełni, jeśli zostawisz krótko." },
      { name: "description", label: "Pełny opis", type: "textarea", help: "Wklej dowolny opis - AI wyciągnie z niego strukturę." },
      { name: "author_org", label: "Autor / organizacja", type: "text" },
      { name: "contact", label: "Kontakt", type: "text" },
      { name: "source_label", label: "Źródło (nazwa)", type: "text" },
      { name: "source_url", label: "Źródło (link)", type: "url" },
      { name: "media", label: "Multimedia (JSON)", type: "textarea", help: 'Np. [{"type":"video","url":"https://…","title":"Film"}]' },
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
      { name: "kind", label: "Rodzaj", type: "select", options: ["report", "regulation", "challenge_map", "guide", "call_rules", "other"], required: true },
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
      { name: "indicators", label: "Wskaźniki (JSON)", type: "textarea", help: 'Np. [{"nazwa":"Odsetek osób 65+","wartosc":"21%","rok":2024}]' },
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
      { name: "rules", label: "Zasady (JSON)", type: "textarea", help: '{"kryteria":["…"],"max_kwota":20000,"sekcje_wniosku":["Problem","Rozwiązanie","Budżet"]}' },
      { name: "opens_at", label: "Otwarcie", type: "date" },
      { name: "closes_at", label: "Zamknięcie", type: "date" },
      { name: "active", label: "Aktywny", type: "boolean" },
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
      { name: "innovation_id", label: "ID innowacji", type: "number", required: true },
      { name: "title", label: "Tytuł", type: "text", required: true },
      { name: "description", label: "Opis", type: "textarea" },
      { name: "status", label: "Status", type: "select", options: ["planned", "open", "closed"], required: true, help: "open = nabór otwarty → zaproszenia dla pasujących osób z listy oczekujących" },
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
