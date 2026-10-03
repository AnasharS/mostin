-- Zasada projektu: bez długich pauz i półpauz w treściach - zamiana na zwykły łącznik w danych już zapisanych
create or replace function public.nodash(t text) returns text language sql immutable as $$
  -- chr(8212) = pauza, chr(8211) = półpauza (kody znaków, żeby w repozytorium nie było samych znaków)
  select replace(replace(replace(replace(t, ' ' || chr(8212) || ' ', ' - '), chr(8212), '-'), ' ' || chr(8211) || ' ', ' - '), chr(8211), '-')
$$;
update public.innovations set title = nodash(title), summary = nodash(summary), description = nodash(description), problem = nodash(problem),
  solution = nodash(solution), location = nodash(location), implementation_requirements = nodash(implementation_requirements),
  resources = nodash(resources), search_text = nodash(search_text), author_org = nodash(author_org), source_label = nodash(source_label),
  needs = (select coalesce(array_agg(nodash(x)), '{}') from unnest(needs) x),
  structured = nodash(structured::text)::jsonb;
update public.challenges set title = nodash(title), summary = nodash(summary), source_label = nodash(source_label), indicators = nodash(indicators::text)::jsonb;
update public.areas set name = nodash(name), description = nodash(description);
update public.documents set title = nodash(title), description = nodash(description);
update public.document_chunks set content = nodash(content), heading = nodash(heading);
update public.calls set title = nodash(title), description = nodash(description), rules = nodash(rules::text)::jsonb;
update public.tests set title = nodash(title), description = nodash(description);
update public.threads set subject = nodash(subject), ai_summary = nodash(ai_summary), ai_draft = nodash(ai_draft), requester_label = nodash(requester_label);
update public.messages set body = nodash(body);
update public.ideas set title = nodash(title), essence = nodash(essence), assessment = nodash(assessment::text)::jsonb;
update public.matches set rationale = nodash(rationale), adaptation = nodash(adaptation);
update public.adaptation_plans set plan = nodash(plan::text)::jsonb;
update public.circles set title = nodash(title), topic = nodash(topic), meeting_note = nodash(meeting_note);
update public.circle_messages set body = nodash(body);
update public.needs set summary = nodash(summary);
update public.jst_leads set summary = nodash(summary), next_step = nodash(next_step), institution = nodash(institution), interested_in = nodash(interested_in);
update public.ai_policy set refusal_message = nodash(refusal_message);
