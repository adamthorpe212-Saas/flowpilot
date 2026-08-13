-- ---------------------------------------------------------------------------
-- A new business can only be created on a plan that is actually sold
--
-- The validation here already knew not to trust the caller — auth metadata is
-- user-editable, so the plan arriving is an expression of intent and never
-- proof of payment. What it got wrong was the list it validated against:
-- ('starter', 'pro', 'business'), written when all three were on sale.
--
-- Starter and Business were withdrawn. The check kept admitting them, so a
-- crafted signup could still create a business row on a tier the site does not
-- advertise, at an allowance nobody costed. The application-side fallback had
-- the matching half of the fault — it defaulted to the literal 'starter' — and
-- both are fixed together, because either one alone leaves the hole open.
--
-- This is the same defect that once billed customers against Starter's 50-call
-- allowance while they paid for Pro: a withdrawn tier left reachable because
-- removing it looked riskier than leaving it.
--
-- The business.plan CHECK constraint deliberately still permits all three.
-- Rows created before the tiers were withdrawn carry those values and must
-- continue to load — getPlan() falls back for exactly that reason. What
-- narrows is what can be created from now on, not what may exist.
-- ---------------------------------------------------------------------------

create or replace function public.create_business_for_current_user(
  business_name text,
  selected_plan text default 'pro'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_business_id uuid;
  safe_plan text := coalesce(selected_plan, 'pro');
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if business_name is null or length(trim(business_name)) = 0 then
    raise exception 'Business name is required';
  end if;

  /*
   * One plan is sold, so one plan can be created. Anything else — a withdrawn
   * tier, a typo, a crafted value — becomes the plan on sale rather than being
   * rejected: a signup must not fail over a field that only ever records
   * intent, and entitlement comes from the Stripe webhook regardless.
   *
   * When a second plan goes on sale this list is what has to change, and it
   * should be a deliberate edit rather than a value that was already permitted.
   */
  if safe_plan not in ('pro') then
    safe_plan := 'pro';
  end if;

  -- One business per user until team accounts exist (roadmap Phase 7). Returning
  -- the existing id rather than raising makes this safe to call on every page
  -- load, which is what lets onboarding work whether or not email confirmation
  -- is enabled on the project.
  select business_id into new_business_id
  from public.business_member
  where user_id = current_user_id
  limit 1;

  if new_business_id is not null then
    return new_business_id;
  end if;

  insert into public.business (name, plan)
  values (trim(business_name), safe_plan)
  returning id into new_business_id;

  insert into public.business_member (business_id, user_id, role)
  values (new_business_id, current_user_id, 'owner');

  return new_business_id;
end;
$$;

revoke all on function public.create_business_for_current_user(text, text) from public;
grant execute on function public.create_business_for_current_user(text, text) to authenticated;
