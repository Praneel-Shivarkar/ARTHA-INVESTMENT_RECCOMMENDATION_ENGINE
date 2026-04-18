create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null default '',
  user_handle text unique not null,
  phone_number text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.users(id) on delete cascade,
  raw_input jsonb not null default '{}'::jsonb,
  risk_score integer not null default 0,
  risk_band text not null default 'Balanced',
  behavioral_flags jsonb not null default '{}'::jsonb,
  portfolio jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.users(id) on delete cascade,
  goal_type text not null default 'Unknown',
  target_amount numeric(18,2),
  horizon_years integer,
  emotional_weight text not null default 'medium',
  contradictions jsonb not null default '[]'::jsonb,
  summary text not null default '',
  inputs jsonb not null default '{}'::jsonb,
  portfolio jsonb not null default '{}'::jsonb,
  simulation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_name text not null,
  scenario_name text not null,
  inflation_rate numeric(6,2) not null default 0,
  allocation jsonb not null,
  portfolio jsonb not null,
  simulation jsonb not null,
  target_plan jsonb not null,
  expected_return numeric(8,2) not null default 0,
  portfolio_risk numeric(8,2) not null default 0,
  diversification jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_user_handle on public.users(user_handle);
create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_goals_user_id on public.goals(user_id);
create index if not exists idx_portfolios_user_id on public.portfolios(user_id);

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.portfolios enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
  on public.users for insert
  with check (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "goals_select_own" on public.goals;
create policy "goals_select_own"
  on public.goals for select
  using (auth.uid() = user_id);

drop policy if exists "goals_insert_own" on public.goals;
create policy "goals_insert_own"
  on public.goals for insert
  with check (auth.uid() = user_id);

drop policy if exists "goals_update_own" on public.goals;
create policy "goals_update_own"
  on public.goals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "portfolios_select_own" on public.portfolios;
create policy "portfolios_select_own"
  on public.portfolios for select
  using (auth.uid() = user_id);

drop policy if exists "portfolios_insert_own" on public.portfolios;
create policy "portfolios_insert_own"
  on public.portfolios for insert
  with check (auth.uid() = user_id);

drop policy if exists "portfolios_update_own" on public.portfolios;
create policy "portfolios_update_own"
  on public.portfolios for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "portfolios_delete_own" on public.portfolios;
create policy "portfolios_delete_own"
  on public.portfolios for delete
  using (auth.uid() = user_id);
