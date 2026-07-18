-- Restrict push_subscriptions / bills to service-role-only access.
-- All writes/reads for these tables go through Next.js API routes using the
-- service role key (see app/api/push/*, app/api/cron/*) — the anon key is
-- never used against these tables client-side. The prior "using (true)"
-- policies let anyone holding the public anon key delete/overwrite any row
-- directly via the Supabase REST API. Run this in your Supabase SQL editor.

drop policy if exists "Anyone can subscribe" on push_subscriptions;
drop policy if exists "Anyone can unsubscribe by endpoint" on push_subscriptions;

drop policy if exists "Anyone can upsert bills by endpoint" on bills;
drop policy if exists "Anyone can update bills by endpoint" on bills;

create policy "Service role can insert subscriptions"
  on push_subscriptions for insert
  with check (auth.role() = 'service_role');

create policy "Service role can delete subscriptions"
  on push_subscriptions for delete
  using (auth.role() = 'service_role');

create policy "Service role can insert bills"
  on bills for insert
  with check (auth.role() = 'service_role');

create policy "Service role can update bills"
  on bills for update
  using (auth.role() = 'service_role');
