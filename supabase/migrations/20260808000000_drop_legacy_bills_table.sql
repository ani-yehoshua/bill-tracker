-- bills_endpoint_legacy was the pre-household, endpoint-keyed JSON blob of
-- bills, kept as a rollback safety net during the Phase 1 migration to
-- per-row household-scoped bills. Its only real data (29 bills) has been
-- migrated into public.bills and verified (count + total match). The
-- push_subscriptions row it was joined to predates the auth rewrite and has
-- no user_id/household_id, so it can't receive real notifications anyway.

drop table if exists public.bills_endpoint_legacy;

delete from public.push_subscriptions
where user_id is null and household_id is null;
