-- Stop a customer granting themselves a free subscription.
--
-- Row-level security gates which ROWS a user may touch, never which COLUMNS.
-- The business_update_own policy correctly limits a user to their own business,
-- and then let them write every column of it — including plan,
-- subscription_status and status.
--
-- Since Supabase grants table privileges to `authenticated` by default, any
-- signed-in customer could have run this from the browser with the publishable
-- key and their own session:
--
--   supabase.from('business').update({
--     plan: 'business',
--     subscription_status: 'active',
--     status: 'active'
--   })
--
-- RLS permits it, the CHECK constraints permit those values, and the result is
-- unlimited Business-tier service for free. Every guarantee about entitlement
-- coming only from the Stripe webhook was defeated by this one policy.
--
-- Column-level GRANTs are the missing half: RLS decides the row, grants decide
-- the column. A customer may edit what describes their business; everything
-- that decides what they are entitled to, or how calls reach them, is writable
-- only by the service role.

revoke update on public.business from authenticated;

grant update (
  name,
  industry_label,
  service_area,
  timezone
) on public.business to authenticated;

-- Leads are created by the system. An owner works them through the pipeline, so
-- status is theirs to change — but the captured details are evidence of what a
-- caller actually said and should not be quietly rewritten.
revoke update on public.lead from authenticated;

grant update (status) on public.lead to authenticated;
