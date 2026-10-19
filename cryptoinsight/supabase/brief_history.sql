-- CryptoInsight brief history (Supabase / Postgres).
-- One row per built-in coin per UTC day, written by the daily refresh.
-- The owner's SQL editor is broken, so this file is reference: create the
-- table via the dashboard Table Editor UI instead (see README for steps).
-- The two SELECT policies below can be created via Database -> Policies ->
-- Create policy, with USING set to: true
--
-- Table spec for the UI:
--   Name: brief_history
--   Columns:
--     id          uuid, Primary key, default gen_random_uuid()
--     coin_symbol text, not null
--     coin_name   text, not null
--     brief_date  date, not null
--     verdict     text, not null
--     glance      text, not null
--     price       numeric, nullable
--     created_at  timestamptz, default now()
--   Unique constraint on (coin_symbol, brief_date).
--   Enable Row Level Security.

create table if not exists public.brief_history (
  id uuid primary key default gen_random_uuid(),
  coin_symbol text not null,
  coin_name text not null,
  brief_date date not null,
  verdict text not null,
  glance text not null,
  price numeric null,
  created_at timestamptz not null default now(),
  unique (coin_symbol, brief_date)
);

alter table public.brief_history enable row level security;

-- The daily writer uses the service_role key, which bypasses RLS, so no
-- write policies are needed. Readers (the site) use the anon key:
drop policy if exists "read history (authenticated)" on public.brief_history;
create policy "read history (authenticated)" on public.brief_history
  for select to authenticated using (true);

drop policy if exists "read history (anon)" on public.brief_history;
create policy "read history (anon)" on public.brief_history
  for select to anon using (true);
