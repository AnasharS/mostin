-- Polski bez słownika w Postgresie nie jest odmieniany: „spastyczność” ≠ „spastycznością”.
-- Prosty stemming: rdzeń słowa dopasowany prefiksem (spastyczn:*). Do tego słowa pospolite są pomijane.

create or replace function public.or_tsquery(txt text) returns tsquery
language sql immutable set search_path = public, extensions as $$
  select coalesce(
    nullif(
      array_to_string(
        array(
          -- prosty stemming dla polskiego: rdzeń (słowo bez 3 ostatnich liter, min. 5) dopasowywany prefiksem — łapie odmianę
          select distinct left(w, greatest(5, length(w) - 3)) || ':*'
          from regexp_split_to_table(extensions.unaccent('extensions.unaccent', lower(coalesce(txt, ''))), '[^a-z0-9]+') as w
          where length(w) >= 4
            and w not in ('jest','sa','byc','bedzie','moze','moge','mozna','mamy','mama','mam','ma','ich','jego','jej','oraz','ktory','ktora',
                          'ktore','ktorzy','tego','temu','taki','takie','tak','jak','juz','jeszcze','tylko','bardzo','dla','przez','przy','pod',
                          'nad','bez','czy','gdy','kiedy','gdzie','co','sie','nie','tez','takze','dodatkowo','swoj','moj','moja','moje','moim',
                          'mojego','twoj','nasz','nasza','nasze','wasz','sobie','mnie','mi','go','ten','ta','to','te','tym','tych','wiec',
                          'aby','zeby','ale','lub','albo','jako','od','do','na','po','za','ze','we','wsrod','sposob','sposobu','szukam',
                          'chce','chcemy','prowadze','robic','zrobic','mozemy','potrzebuje','pomoc','pomocy','stac','czyli','wiele','duzo')
          limit 40
        ),
        ' | '
      ),
      ''
    ),
    'xyznomatch'
  )::tsquery;
$$;

