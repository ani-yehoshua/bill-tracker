-- Phase 1: real accounts + shared households + bills as per-row server data.
-- See /home/yehoshua/.claude/plans/peppy-wobbling-patterson.md for the design
-- rationale. Idempotent: safe to re-run.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. IDENTITY
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  avatar_emoji text not null default '🙂',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. HOUSEHOLDS
-- ═══════════════════════════════════════════════════════════════════════════

-- Ambiguity-free alphabet (no 0/O, 1/I/L) — this is read off one screen and
-- typed into another.
create or replace function public.gen_invite_code()
returns text language plpgsql volatile as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  code text; i int;
begin
  loop
    code := 'OWED-';
    for i in 1..4 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.households h where h.invite_code = code);
  end loop;
  return code;
end $$;

create table if not exists public.households (
  id           uuid primary key default gen_random_uuid(),
  name         text not null default 'Our Household',
  invite_code  text unique default public.gen_invite_code(),  -- null = closed
  created_by   uuid references auth.users(id) on delete set null,
  currency     text not null default 'USD',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'member' check (role in ('owner','member')),
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Phase 1 rule: exactly one household per user.
create unique index if not exists household_members_one_per_user
  on public.household_members (user_id);

-- ── RLS recursion guard ──────────────────────────────────────────────────
-- A policy on household_members that subqueries household_members causes
-- "infinite recursion detected in policy" (42P17). A SECURITY DEFINER
-- helper's internal read bypasses RLS, so there's nothing to recurse into.
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = auth.uid()
  );
$$;

create or replace function public.my_household_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from public.household_members where user_id = auth.uid() limit 1;
$$;

revoke execute on function public.is_household_member(uuid) from public, anon;
revoke execute on function public.my_household_id()          from public, anon;
grant  execute on function public.is_household_member(uuid) to authenticated;
grant  execute on function public.my_household_id()          to authenticated;

alter table public.profiles           enable row level security;
alter table public.households         enable row level security;
alter table public.household_members  enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid())
      or exists (select 1 from public.household_members m
                 where m.user_id = profiles.id
                   and public.is_household_member(m.household_id)));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists households_select on public.households;
create policy households_select on public.households for select to authenticated
  using (public.is_household_member(id));

drop policy if exists households_update on public.households;
create policy households_update on public.households for update to authenticated
  using (public.is_household_member(id)) with check (public.is_household_member(id));

drop policy if exists hm_select on public.household_members;
create policy hm_select on public.household_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_household_member(household_id));

drop policy if exists hm_delete on public.household_members;
create policy hm_delete on public.household_members for delete to authenticated
  using (user_id = (select auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. BILLS — moved from an endpoint-keyed JSON blob to per-row, household-scoped
-- ═══════════════════════════════════════════════════════════════════════════

do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'bills')
     and not exists (select 1 from information_schema.tables
                      where table_schema = 'public' and table_name = 'bills_endpoint_legacy')
  then
    alter table public.bills rename to bills_endpoint_legacy;
    alter index if exists bills_pkey rename to bills_endpoint_legacy_pkey;
  end if;
end $$;

create table if not exists public.bills (
  id                 uuid primary key default gen_random_uuid(),
  household_id       uuid not null references public.households(id) on delete cascade,
  name               text not null check (length(trim(name)) > 0),
  amount             numeric(12,2) not null check (amount >= 0),
  due_day            smallint not null check (due_day between 1 and 31),
  due_month          smallint check (due_month between 0 and 11),   -- 0-indexed, yearly only
  category           text not null default 'other'
                     check (category in ('housing','utility','sub','auto','health','other')),
  recurrence         text not null default 'monthly'
                     check (recurrence in ('once','monthly','yearly')),
  month_key          text,        -- 'YYYY-M' (0-indexed month), once-only bills
  notes              text,
  notify_days_before smallint not null default 3 check (notify_days_before between 0 and 31),
  color              text,
  ring_id            uuid,        -- FK added below (Phase 2 budget rings)
  archived_at        timestamptz, -- soft delete: keeps bill_paid history intact
  created_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint bills_once_needs_month  check (recurrence <> 'once'   or month_key is not null),
  constraint bills_yearly_needs_mon  check (recurrence <> 'yearly' or due_month is not null)
);
create index if not exists bills_household_idx
  on public.bills (household_id) where archived_at is null;

create table if not exists public.bill_paid (
  id           uuid primary key default gen_random_uuid(),
  bill_id      uuid not null references public.bills(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  month_key    text not null,
  amount_paid  numeric(12,2),
  paid_by      uuid references auth.users(id) on delete set null,
  paid_at      timestamptz not null default now(),
  unique (bill_id, month_key)   -- row exists = paid. delete = unpaid.
);
create index if not exists bill_paid_household_month_idx
  on public.bill_paid (household_id, month_key);

create or replace function public.enforce_bill_household()
returns trigger language plpgsql as $$
begin
  select household_id into new.household_id from public.bills where id = new.bill_id;
  if new.household_id is null then raise exception 'unknown bill'; end if;
  return new;
end $$;
drop trigger if exists bill_paid_household_bi on public.bill_paid;
create trigger bill_paid_household_bi before insert or update on public.bill_paid
  for each row execute function public.enforce_bill_household();

drop trigger if exists bills_updated_at on public.bills;
create trigger bills_updated_at before update on public.bills
  for each row execute function public.update_updated_at();

alter table public.bills     enable row level security;
alter table public.bill_paid enable row level security;

drop policy if exists bills_all on public.bills;
create policy bills_all on public.bills for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

drop policy if exists bill_paid_all on public.bill_paid;
create policy bill_paid_all on public.bill_paid for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. FORWARD-LOOKING TABLES (Phase 2/3) — created now, unused until then
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.budget_rings (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  name          text not null,
  target_amount numeric(12,2) not null default 0 check (target_amount >= 0),
  color         text not null default '#C8A96E',
  icon          text not null default '🎯',
  period        text not null default 'monthly' check (period in ('monthly','weekly','yearly')),
  kind          text not null default 'spend'  check (kind in ('spend','save')),
  sort_order    int  not null default 0,
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'bills' and constraint_name = 'bills_ring_fk'
  ) then
    alter table public.bills add constraint bills_ring_fk
      foreign key (ring_id) references public.budget_rings(id) on delete set null;
  end if;
end $$;

create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  ring_id      uuid references public.budget_rings(id) on delete set null,
  amount       numeric(12,2) not null check (amount > 0),
  description  text,
  spent_on     date not null default current_date,
  month_key    text not null,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists expenses_household_month_idx on public.expenses (household_id, month_key);

create table if not exists public.paychecks (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete set null,
  amount       numeric(12,2) not null check (amount > 0),
  received_on  date not null default current_date,
  month_key    text not null,
  source       text,
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists paychecks_household_month_idx on public.paychecks (household_id, month_key);

create table if not exists public.household_settings (
  household_id          uuid primary key references public.households(id) on delete cascade,
  monthly_income_target numeric(12,2),
  payday_weekday        smallint check (payday_weekday between 0 and 6),
  updated_at            timestamptz not null default now()
);

create table if not exists public.milestones (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  key          text not null,
  achieved_at  timestamptz not null default now(),
  achieved_by  uuid references auth.users(id) on delete set null,
  meta         jsonb not null default '{}',
  unique (household_id, key)
);

create table if not exists public.household_stats (
  household_id       uuid primary key references public.households(id) on delete cascade,
  streak_current     int  not null default 0,
  streak_best        int  not null default 0,
  last_streak_month  text,
  points             int  not null default 0,
  updated_at         timestamptz not null default now()
);

alter table public.budget_rings      enable row level security;
alter table public.expenses          enable row level security;
alter table public.paychecks         enable row level security;
alter table public.household_settings enable row level security;
alter table public.milestones        enable row level security;
alter table public.household_stats   enable row level security;

drop policy if exists budget_rings_all on public.budget_rings;
create policy budget_rings_all on public.budget_rings for all to authenticated
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

drop policy if exists expenses_all on public.expenses;
create policy expenses_all on public.expenses for all to authenticated
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

drop policy if exists paychecks_all on public.paychecks;
create policy paychecks_all on public.paychecks for all to authenticated
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

drop policy if exists household_settings_all on public.household_settings;
create policy household_settings_all on public.household_settings for all to authenticated
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

drop policy if exists milestones_all on public.milestones;
create policy milestones_all on public.milestones for all to authenticated
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

drop policy if exists household_stats_all on public.household_stats;
create policy household_stats_all on public.household_stats for all to authenticated
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. HOUSEHOLD CREATE / JOIN RPCs
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.create_household(p_name text default 'Our Household')
returns public.households
language plpgsql security definer set search_path = public as $$
declare h public.households;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'already_in_household';
  end if;

  insert into public.households (name, created_by)
    values (coalesce(nullif(trim(p_name), ''), 'Our Household'), auth.uid())
    returning * into h;
  insert into public.household_members (household_id, user_id, role)
    values (h.id, auth.uid(), 'owner');
  insert into public.household_settings (household_id) values (h.id);
  insert into public.household_stats    (household_id) values (h.id);
  insert into public.budget_rings (household_id, name, color, icon, kind, sort_order) values
    (h.id, 'Grocery',  '#7BF0C9', '🛒', 'spend', 0),
    (h.id, 'Personal', '#B07BF0', '🧴', 'spend', 1),
    (h.id, 'Gas',      '#F0C97B', '⛽', 'spend', 2),
    (h.id, 'Savings',  '#6EC8A0', '🏦', 'save',  3);
  return h;
end $$;

create or replace function public.join_household_by_code(p_code text)
returns public.households
language plpgsql security definer set search_path = public as $$
declare h public.households; norm text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'already_in_household';
  end if;

  norm := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(norm) <> 8 then raise exception 'invalid_code'; end if;

  select * into h from public.households
   where upper(regexp_replace(invite_code, '[^A-Za-z0-9]', '', 'g')) = norm;
  if h.id is null then raise exception 'invalid_code'; end if;

  insert into public.household_members (household_id, user_id, role)
    values (h.id, auth.uid(), 'member')
    on conflict (household_id, user_id) do nothing;

  -- Single-use code: close it once the household has 2+ members.
  update public.households set invite_code = null
   where id = h.id
     and (select count(*) from public.household_members m where m.household_id = h.id) >= 2;

  select * into h from public.households where id = h.id;
  return h;
end $$;

create or replace function public.rotate_invite_code()
returns text language plpgsql security definer set search_path = public as $$
declare hid uuid; code text;
begin
  hid := public.my_household_id();
  if hid is null then raise exception 'no_household'; end if;
  code := public.gen_invite_code();
  update public.households set invite_code = code where id = hid;
  return code;
end $$;

revoke execute on function public.create_household(text)        from public, anon;
revoke execute on function public.join_household_by_code(text)  from public, anon;
revoke execute on function public.rotate_invite_code()          from public, anon;
grant  execute on function public.create_household(text)        to authenticated;
grant  execute on function public.join_household_by_code(text)  to authenticated;
grant  execute on function public.rotate_invite_code()          to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. REALTIME
-- ═══════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bills'
  ) then
    alter publication supabase_realtime add table public.bills;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bill_paid'
  ) then
    alter publication supabase_realtime add table public.bill_paid;
  end if;
end $$;

-- Without FULL, DELETE events carry only the PK and RLS-filtered
-- postgres_changes can't evaluate the policy on a partial old record —
-- deletes get silently dropped client-side.
alter table public.bills     replica identity full;
alter table public.bill_paid replica identity full;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. PUSH SUBSCRIPTIONS — device belongs to a user, belongs to a household
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.push_subscriptions
  add column if not exists user_id              uuid references auth.users(id) on delete cascade,
  add column if not exists household_id         uuid references public.households(id) on delete cascade,
  add column if not exists notify_time           text not null default '09:00',
  add column if not exists utc_offset_minutes    int  not null default 0,
  add column if not exists last_sent_date        date,
  add column if not exists last_sent_local_date  text;  -- 'YYYY-MM-DD' in the device's local time
create index if not exists push_subscriptions_household_idx
  on public.push_subscriptions (household_id);

drop policy if exists "Service role can insert subscriptions" on public.push_subscriptions;
drop policy if exists "Service role can delete subscriptions" on public.push_subscriptions;
drop policy if exists "Service role can read all"             on public.push_subscriptions;

create policy push_subs_own on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
