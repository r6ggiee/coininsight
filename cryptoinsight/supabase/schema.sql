-- CryptoInsight accounts schema (Supabase / Postgres).
-- Paste this whole file into the Supabase dashboard: SQL Editor -> New query -> Run.
-- It is safe to run twice (uses IF NOT EXISTS / OR REPLACE / DROP IF EXISTS).

-- 1. Profiles: one row per auth user, created automatically on signup.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

-- 2. User settings: theme + defaults. One row per user.
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  default_coin text,
  updated_at timestamptz not null default now()
);

-- 3. Watchlist: the user's starred coins. Deduplicated per CoinGecko id.
create table if not exists public.watchlist_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  coin_symbol text not null,
  coin_name text not null,
  coingecko_id text not null,
  added_at timestamptz not null default now(),
  primary key (user_id, coingecko_id)
);

-- 4. Row Level Security: users can only touch their own rows.
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.watchlist_items enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own settings" on public.user_settings;
create policy "own settings" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own watchlist" on public.watchlist_items;
create policy "own watchlist" on public.watchlist_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. Auto-create profile + settings rows when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
