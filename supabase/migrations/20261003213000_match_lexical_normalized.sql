-- Leksyka znormalizowana do najlepszego kandydata zamiast przycięcia do 1 (wiele innowacji miało 1.0).

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
           ts_rank_cd(i.fts, q.tsq, 32) as lex_raw,
           ((case when filter_categories is not null and i.categories && filter_categories then 0.6 else 0 end)
          + (case when filter_target_groups is not null and i.target_groups && filter_target_groups then 0.4 else 0 end))::real as meta
    from pool p join public.innovations i on i.id = p.id, q
  ),
  normalized as (
    -- leksyka względem najlepszego kandydata w puli: rozróżnia „pasuje jedno słowo” od „pasują kluczowe słowa wielokrotnie”
    select *, (case when max(lex_raw) over () > 0 then lex_raw / max(lex_raw) over () else 0 end)::real as lexical
    from scored
  )
  select id, title, summary, problem, categories, target_groups, location, stage, is_sample,
         semantic, lexical, meta,
         (0.6 * semantic + 0.25 * lexical + 0.15 * meta)::real as score
  from normalized
  order by score desc
  limit match_count;
$$;
