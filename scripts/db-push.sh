#!/bin/bash
# Wypycha migracje z supabase/migrations na zdalną bazę.
# Czyta NEXT_PUBLIC_SUPABASE_URL i SupabasePass z .env.local (nie wypisuje sekretów).
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env.local; set +a
REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -E 's#https://([^.]+)\..*#\1#')
PASS=$(python3 -c 'import urllib.parse,os;print(urllib.parse.quote(os.environ["SupabasePass"],safe=""))')
POOLER_HOST=${POOLER_HOST:-aws-0-eu-west-1.pooler.supabase.com}
npx supabase db push --yes --db-url "postgresql://postgres.${REF}:${PASS}@${POOLER_HOST}:5432/postgres" "$@"
