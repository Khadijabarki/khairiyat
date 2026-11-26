-- Khairiyat database. Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- It is safe to run again: it only creates what is missing and refreshes the sample rows.
--
-- Privacy by design:
-- - Full conversation transcripts are NEVER stored. Only a short summary and simple scores.
-- - Row Level Security is ON with no policies, so nobody can read or write these tables
--   from a browser. Only our server (with the secret key) can.

-- One row per finished daily check-in.
create table if not exists public.checkins (
  id              uuid primary key default gen_random_uuid(),
  parent_id       text not null check (parent_id ~ '^[a-z0-9_-]{1,64}$'),
  created_at      timestamptz not null default now(),
  summary         text not null check (char_length(summary) <= 1000),        -- short Roman Urdu summary
  family_message  text check (char_length(family_message) <= 1000),          -- the message sent to the family
  mood            smallint check (mood between 1 and 5),                     -- 1 = very low, 5 = very good
  pain            smallint check (pain between 0 and 10),                    -- 0 = no pain
  sleep           smallint check (sleep between 1 and 5),                    -- 1 = very bad, 5 = very good
  medicine_taken  boolean,                                                   -- null = not discussed
  ate             boolean,
  risk_level      text not null default 'normal' check (risk_level in ('normal', 'concern', 'urgent')),
  alerts          jsonb not null default '[]'::jsonb,                        -- [{category, reason, source}]
  is_sample       boolean not null default false                             -- demo data, shown with a "sample" label
);
create index if not exists checkins_parent_time on public.checkins (parent_id, created_at desc);

-- Alerts raised DURING a call (an emergency should reach the family right away,
-- not only when the call ends).
create table if not exists public.live_alerts (
  id          uuid primary key default gen_random_uuid(),
  parent_id   text not null check (parent_id ~ '^[a-z0-9_-]{1,64}$'),
  created_at  timestamptz not null default now(),
  category    text not null check (category ~ '^[a-z_]{1,40}$'),
  level       text not null check (level in ('concern', 'urgent')),
  reason      text check (char_length(reason) <= 300),
  source      text not null check (source in ('ai', 'keywords'))
);
create index if not exists live_alerts_parent_time on public.live_alerts (parent_id, created_at desc);

-- Lock both tables: no browser access at all.
alter table public.checkins enable row level security;
alter table public.live_alerts enable row level security;

-- Only our server's role may use these tables. New Supabase projects grant nothing by
-- default, so we give the server exactly what it needs and make sure the browser roles
-- (anon = not signed in, authenticated = signed-in users) get nothing.
grant select, insert on public.checkins, public.live_alerts to service_role;
grant delete on public.checkins to service_role; -- for refreshing the sample rows
revoke all on public.checkins, public.live_alerts from anon, authenticated;

-- ---------- Sample data for the demo (last 7 days) ----------
-- Clearly marked is_sample = true and shown as "sample" on the dashboard.
delete from public.checkins where is_sample;

insert into public.checkins (parent_id, created_at, summary, family_message, mood, pain, sleep, medicine_taken, ate, risk_level, alerts, is_sample) values
-- Ammi: knee pain that gets better over the week (shows the memory feature)
('ammi', now() - interval '7 days', 'Ammi ki tabiyat theek thi. Neend achi aayi, BP ki goli li, nashta kiya. Pote ki baatein kar ke khush thin.', 'Ammi theek hain, dawai li aur mood acha tha.', 5, 0, 4, true, true, 'normal', '[]', true),
('ammi', now() - interval '6 days', 'Ammi ne ghutne mein halke dard ka bataya. Neend theek aayi, dawai li.', 'Ammi ke ghutne mein halka dard hai, baqi sab theek.', 4, 3, 4, true, true, 'normal', '[]', true),
('ammi', now() - interval '5 days', 'Ghutne ka dard barh gaya, seedhiyan chadhne mein mushkil. Raat ko neend kam aayi. Dawai li.', 'Ammi ka ghutne ka dard barh gaya hai, neend kam aayi. Aaj call kar lein.', 3, 6, 2, true, true, 'concern', '[{"category":"lonely_sad","reason":"Ammi ne kaha akelapan mehsoos hota hai.","source":"ai"}]', true),
('ammi', now() - interval '4 days', 'Ghutne ka dard thora kam hua. Ammi ne bataya ke kisi ne phone par OTP maanga tha, unhein samjhaya ke kabhi na batayein.', 'Fraud call ki koshish hui thi, Ammi ne OTP nahi bataya. Dard thora kam hai.', 3, 4, 3, true, true, 'concern', '[{"category":"scam_call","reason":"Ammi ko bank ke naam se call aayi aur OTP maanga gaya.","source":"ai"}]', true),
('ammi', now() - interval '3 days', 'Ammi ki tabiyat behtar thi. Dard kam, neend achi. Sugar ki goli raat ko li.', 'Ammi behtar hain, dard kam hai.', 4, 2, 4, true, true, 'normal', '[]', true),
('ammi', now() - interval '2 days', 'Ammi ne subah ki BP ki goli bhool gayi thi, yaad dilane par le li. Mood acha tha.', 'Ammi subah ki dawai bhool gayi thin, yaad dilane par le li.', 4, 1, 4, false, true, 'concern', '[{"category":"medicine_missed","reason":"Ammi subah ki BP ki goli bhool gayi thin.","source":"ai"}]', true),
('ammi', now() - interval '1 days', 'Ammi bilkul theek thin. Ghutne ka dard na hone ke barabar. Purane gaane suna rahi thin.', 'Ammi theek hain aur khush thin.', 5, 1, 5, true, true, 'normal', '[]', true),
-- Abbu: mostly well, one dizziness day
('abbu', now() - interval '7 days', 'Abbu ne subah sair ki, dil ki goli li. Cricket match ki baatein ki.', 'Abbu theek hain, sair bhi ki.', 5, 0, 4, true, true, 'normal', '[]', true),
('abbu', now() - interval '6 days', 'Abbu theek the, neend thori kam aayi. Dawai li.', 'Abbu theek hain, neend thori kam aayi.', 4, 0, 3, true, true, 'normal', '[]', true),
('abbu', now() - interval '5 days', 'Abbu ko subah halka chakkar aaya tha, paani piya to behtar hue. Dawai li.', 'Abbu ko halka chakkar aaya tha, ab behtar hain. Aaj call kar lein.', 3, 2, 3, true, true, 'concern', '[{"category":"dizziness","reason":"Abbu ko subah halka chakkar aaya.","source":"ai"}]', true),
('abbu', now() - interval '4 days', 'Abbu ki tabiyat behtar thi. Purane dost se mile.', 'Abbu theek hain, dost se mile.', 5, 0, 4, true, true, 'normal', '[]', true),
('abbu', now() - interval '3 days', 'Abbu ne raat ki cholesterol ki goli bhool gaye the. Baqi sab theek.', 'Abbu raat ki goli bhool gaye the.', 4, 0, 4, false, true, 'concern', '[{"category":"medicine_missed","reason":"Abbu raat ki cholesterol ki goli bhool gaye.","source":"ai"}]', true),
('abbu', now() - interval '2 days', 'Abbu theek the, khabron ki baatein ki. Neend achi aayi.', 'Abbu theek hain.', 4, 0, 5, true, true, 'normal', '[]', true),
('abbu', now() - interval '1 days', 'Abbu ne sair ki aur khush the. Dawai li.', 'Abbu theek aur khush hain.', 5, 0, 4, true, true, 'normal', '[]', true);
