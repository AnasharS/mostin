# MostIn

Prototyp na HackYeah 2026, zadanie UMWM / ROPS Kraków: Małopolski Hub Innowacji Społecznych. Demo: https://mostin.pl (przełącznik DEMO u góry strony, bez haseł).

MostIn łączy problem społeczny ze sprawdzoną innowacją z Biblioteki ROPS, wiedzą ROPS i ludźmi, którzy mogą pomóc. Mostek, asystent AI nad całym serwisem, odpowiada tylko na podstawie danych ROPS i podaje źródła.

- Opis projektu: [opis-projektu.md](opis-projektu.md)
- Decyzje projektowe i bezpieczeństwa: [notatki.md](notatki.md)
- Architektura: [ARCHITECTURE.md](ARCHITECTURE.md)
- Makiety UX/UI: https://mostin.pl/makiety

## Stack

Next.js 16 (TypeScript, Tailwind 4, Base UI), Supabase (Postgres + pgvector, RLS, Storage), Claude Opus 5.5 i Sonnet 5.5, OpenAI (embeddingi, obrazy, moderacja, mowa). Hosting: Netlify + Supabase.

## Uruchomienie

```bash
pnpm install
cp .env.example .env.local   # klucze Supabase, Anthropic i OpenAI
pnpm db:push                 # migracje z supabase/migrations
pnpm ingest                  # import Biblioteki Innowacji ROPS
pnpm ingest:docs             # dokumenty ROPS do bazy wiedzy
pnpm seed:mapa               # Mapa Wyzwań Społecznych
pnpm seed:demo && pnpm seed:demo-extra   # dane przykładowe (DEMO_MODE=true)
pnpm dev
```

`pnpm verify:facts` sprawdza, czy każdy fakt naboru z `lib/jst/facts.ts` ma dosłowny cytat w dokumencie ROPS.
