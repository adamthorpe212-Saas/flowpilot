-- Stop stamping every new business with a plan nobody can buy.
--
-- `business.plan` defaulted to 'starter' and so did create_business_for_current_user,
-- from back when three tiers were sold. Only 'pro' is sold now, so every signup
-- was being written as Starter — and the product believed it:
--
--   * Billing showed "Starter — €49/month · up to 50 answered calls", which is
--     not a thing anybody can purchase.
--   * getUsage() metered them against Starter's 50 calls instead of 200, so the
--     dashboard would have warned a paying customer they were near a limit that
--     is not theirs.
--
-- Nobody has ever subscribed, so moving existing rows is safe. The update is
-- narrowed to businesses that never reached checkout anyway — a real Starter
-- subscriber, if one ever existed, keeps the tier they pay for.
--
-- The default still names a plan in SQL, which will drift again if what we sell
-- changes. The durable fix is in the application: signup now passes soldPlan()
-- explicitly, so this default is a fallback rather than the source of truth.

alter table public.business
  alter column plan set default 'pro';

update public.business
set plan = 'pro'
where plan = 'starter'
  and subscription_status in ('incomplete', 'trialing')
  and stripe_subscription_id is null;

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

  -- Still validated rather than trusted. A user can edit their own auth
  -- metadata, so the plan arriving here is an expression of intent and never
  -- proof of payment — entitlement comes from the Stripe webhook alone.
  if safe_plan not in ('starter', 'pro', 'business') then
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
