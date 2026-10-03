-- Konfiguracja osobowości Mostka przez ROPS: archetyp (tone of voice), forma zwracania się, długość odpowiedzi

alter table public.ai_policy
  add column tone_archetype text not null default 'opiekun'
    check (tone_archetype in ('opiekun', 'medrzec', 'towarzysz', 'przewodnik', 'tworca', 'bohater')),
  add column address_form text not null default 'auto'
    check (address_form in ('auto', 'ty', 'pan_pani')),
  add column response_length text not null default 'zwiezle'
    check (response_length in ('bardzo_krotko', 'zwiezle', 'szczegolowo')),
  add column plain_language_default boolean not null default false,
  add column allow_emoji boolean not null default false,
  add column custom_instructions text not null default '';
