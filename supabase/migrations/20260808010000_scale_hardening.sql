-- Pre-scale hardening pass, from Supabase's performance/security advisors.
-- None of these were broken — all cheap, standard hygiene before real load:
--   1. Missing indexes on FK columns — harmless today at low row counts, but
--      every one backs an ON DELETE CASCADE/SET NULL, which forces a full
--      table scan on the referencing table once it has real data.
--   2. A few functions don't pin `search_path`. None are SECURITY DEFINER,
--      so this isn't currently exploitable, but it's the same class of
--      issue already handled carefully elsewhere in this schema.
--   3. handle_new_user() has stray EXECUTE grants to anon/authenticated —
--      it's trigger-only (fires on auth.users insert) and doesn't need
--      them; trigger invocation isn't subject to the same ACL check as an
--      explicit RPC call, so revoking is safe.
-- Not touched: rls_auto_enable() (Supabase-managed platform infra, not
-- ours), leaked-password protection (irrelevant — this app is email-OTP
-- only, no passwords), and the Auth DB connection-pool allocation strategy
-- (a dashboard setting, not something a SQL migration can change).

-- ── 1. Missing FK indexes ────────────────────────────────────────────────
create index if not exists bill_paid_paid_by_idx           on public.bill_paid (paid_by);
create index if not exists bills_created_by_idx             on public.bills (created_by);
create index if not exists bills_ring_id_idx                on public.bills (ring_id);
create index if not exists budget_rings_household_id_idx    on public.budget_rings (household_id);
create index if not exists expenses_created_by_idx          on public.expenses (created_by);
create index if not exists expenses_ring_id_idx             on public.expenses (ring_id);
create index if not exists households_created_by_idx        on public.households (created_by);
create index if not exists milestones_achieved_by_idx       on public.milestones (achieved_by);
create index if not exists paychecks_user_id_idx            on public.paychecks (user_id);
create index if not exists push_subscriptions_user_id_idx   on public.push_subscriptions (user_id);

-- ── 2. Pin search_path on functions that were missing it ────────────────
create or replace function public.update_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.gen_invite_code()
returns text language plpgsql volatile set search_path = public as $$
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

create or replace function public.enforce_bill_household()
returns trigger language plpgsql set search_path = public as $$
begin
  select household_id into new.household_id from public.bills where id = new.bill_id;
  if new.household_id is null then raise exception 'unknown bill'; end if;
  return new;
end $$;

-- ── 3. Revoke unneeded EXECUTE on the trigger-only profile-creation fn ──
revoke execute on function public.handle_new_user() from public, anon, authenticated;
