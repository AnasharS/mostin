-- Tryb głosowy: włączanie per podstrona, wybór głosu i tonu (ROPS), licznik kosztów (ai_usage.units = minuty)
alter table public.ai_policy
  add column voice_pages jsonb not null default
    '{"/": true, "/mostek": true, "/innowacje": true, "/testuj": true, "/przesla": true, "/rozmowy": true, "/dla-gmin": false, "/kreator": false, "/admin": false}',
  add column tts_voice text not null default 'coral',
  add column tts_instructions text not null default
    'Mów po polsku, ciepło i spokojnie, wyraźnie artykułując słowa, w umiarkowanym tempie - tak, by zrozumiała Cię osoba starsza lub słabowidząca.',
  add column tts_auto_read boolean not null default false;
