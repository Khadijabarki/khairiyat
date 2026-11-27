-- Khairiyat database. Run this in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run again: it only creates or changes what is missing. Existing data is kept.
-- Demo parents and sample data are added by `npm run setup:demo` (see README).
--
-- Privacy and security by design:
-- - Full conversation transcripts are NEVER stored. Only a short summary and simple scores.
-- - Row Level Security is ON and browser roles get NO access at all. Only our server
--   (with the secret key) can read or write, and it always checks which family is signed in.

-- ---------- Parents (added by a family account) ----------
create table if not exists public.parents (
  id               text primary key default gen_random_uuid()::text,
  family_id        uuid not null references auth.users (id) on delete cascade,  -- the son/daughter's account
  created_at       timestamptz not null default now(),
  name             text not null check (char_length(name) between 1 and 80),     -- e.g. Zubaida Begum
  nickname         text not null check (char_length(nickname) between 1 and 40), -- e.g. Ammi
  nickname_ur      text not null default '' check (char_length(nickname_ur) <= 40),
  gender           text not null check (gender in ('female', 'male')),
  language         text not null default 'urdu' check (language in ('urdu', 'auto', 'punjabi')),
  child_name       text not null check (char_length(child_name) between 1 and 40),
  child_name_ur    text not null default '' check (char_length(child_name_ur) <= 40),
  child_phone      text not null default '' check (child_phone = '' or child_phone ~ '^\+?[0-9]{7,15}$'),
  companion_gender text not null default 'female' check (companion_gender in ('female', 'male')),
  voice            text not null default 'Sulafat' check (voice ~ '^[A-Za-z]{2,30}$'),
  medicines        jsonb not null default '[]'::jsonb,           -- [{"name": "BP ki goli", "when": "subah"}]
  topics           text[] not null default '{}',
  checkin_time     time not null default '10:00',                -- daily call time, Pakistan time
  talk_token       text not null unique check (talk_token ~ '^[A-Za-z0-9_-]{8,64}$'),  -- secret part of the talk link
  consent_given    boolean not null default false,               -- the parent agreed to talk to an AI
  is_demo          boolean not null default false
);
create index if not exists parents_family on public.parents (family_id);

-- ---------- Daily check-ins (one row per finished call) ----------
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

-- ---------- Alerts raised DURING a call ----------
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

-- Check-ins and alerts belong to a parent and are deleted with them.
-- NOT VALID: older rows are kept as they are; every new row is checked.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'checkins_parent_fk') then
    alter table public.checkins add constraint checkins_parent_fk
      foreign key (parent_id) references public.parents (id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'live_alerts_parent_fk') then
    alter table public.live_alerts add constraint live_alerts_parent_fk
      foreign key (parent_id) references public.parents (id) on delete cascade not valid;
  end if;
end $$;

-- ---------- Phones that can receive Khairiyat's calls (Web Push) ----------
-- Created when the parent taps "allow calls" on their installed app.
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  parent_id   text not null references public.parents (id) on delete cascade,
  created_at  timestamptz not null default now(),
  endpoint    text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh      text not null check (char_length(p256dh) <= 200),   -- public encryption key of the phone
  auth        text not null check (char_length(auth) <= 100)       -- shared secret for encrypting messages
);
create index if not exists push_subscriptions_parent on public.push_subscriptions (parent_id);

-- ---------- Family phones and computers that receive alerts (Web Push) ----------
create table if not exists public.family_devices (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  endpoint    text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh      text not null check (char_length(p256dh) <= 200),
  auth        text not null check (char_length(auth) <= 100)
);
create index if not exists family_devices_family on public.family_devices (family_id);
alter table public.family_devices enable row level security;
grant select, insert, update, delete on public.family_devices to service_role;
revoke all on public.family_devices from anon, authenticated;

-- ---------- Calls: one row each time Khairiyat rings a parent ----------
create table if not exists public.calls (
  id           uuid primary key default gen_random_uuid(),
  parent_id    text not null references public.parents (id) on delete cascade,
  created_at   timestamptz not null default now(),
  kind         text not null check (kind in ('scheduled', 'manual', 'retry')),
  attempt      smallint not null default 1 check (attempt between 1 and 5),
  status       text not null default 'ringing' check (status in ('ringing', 'answered', 'declined', 'missed', 'failed')),
  answered_at  timestamptz,
  devices      smallint not null default 0                        -- how many phones the call reached
);
create index if not exists calls_parent_time on public.calls (parent_id, created_at desc);
create index if not exists calls_ringing on public.calls (status, created_at) where status = 'ringing';

-- ---------- Lock everything down ----------
alter table public.parents enable row level security;
alter table public.checkins enable row level security;
alter table public.live_alerts enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.calls enable row level security;
grant select, insert, update, delete on public.push_subscriptions, public.calls to service_role;
revoke all on public.push_subscriptions, public.calls from anon, authenticated;

-- Only our server's role may use these tables. New Supabase projects grant nothing by
-- default; we give the server exactly what it needs and the browser roles nothing.
grant select, insert, update, delete on public.parents to service_role;
grant select, insert, delete on public.checkins to service_role;
grant select, insert, delete on public.live_alerts to service_role;
revoke all on public.parents, public.checkins, public.live_alerts from anon, authenticated;
