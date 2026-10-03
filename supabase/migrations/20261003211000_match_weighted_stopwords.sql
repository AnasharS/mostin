-- Powrót do średniej ważonej (RRF przegrywał przy długich opisach: ranking leksykalny zdominowały słowa pospolite).
-- or_tsquery pomija polskie słowa pospolite, więc dopasowanie leksykalne premiuje słowa znaczące (np. „spastyczność”).

create or replace function public.or_tsquery(txt text) returns tsquery
language sql immutable set search_path = public, extensions as $$
  select coalesce(
    nullif(
      array_to_string(
        array(
          select distinct w
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

create or replace function public.match_innovations(
  query_embedding extensions.vector(1536),
  query_text text,
  filter_categories text[] default null,
  filter_target_groups text[] default null,
  match_count int default 20
)
returns table (id bigint, title text, summary text, problem text, categories text[], target_groups text[],
               location text, stage text, is_sample boolean, semantic real, lexical real, meta real, score real)
language sql stable set search_path = public, extensions as $$
  with q as (select public.or_tsquery(query_text) as tsq),
  pool as (
    -- kandydaci z obu rankingów: semantycznego i leksykalnego
    (select i.id from public.innovations i where i.published and i.embedding is not null
      order by i.embedding <=> query_embedding limit 60)
    union
    (select i.id from public.innovations i, q where i.published and i.fts @@ q.tsq
      order by ts_rank_cd(i.fts, q.tsq, 32) desc limit 30)
  ),
  scored as (
    select i.id, i.title, i.summary, i.problem, i.categories, i.target_groups, i.location, i.stage, i.is_sample,
           (1 - (i.embedding <=> query_embedding))::real as semantic,
           least(ts_rank_cd(i.fts, q.tsq, 32) * 3, 1)::real as lexical,
           ((case when filter_categories is not null and i.categories && filter_categories then 0.6 else 0 end)
          + (case when filter_target_groups is not null and i.target_groups && filter_target_groups then 0.4 else 0 end))::real as meta
    from pool p join public.innovations i on i.id = p.id, q
  )
  select id, title, summary, problem, categories, target_groups, location, stage, is_sample,
         semantic, lexical, meta,
         (0.6 * semantic + 0.25 * lexical + 0.15 * meta)::real as score
  from scored
  order by score desc
  limit match_count;
$$;
