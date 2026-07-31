-- Creating a business is deliberately not an INSERT policy on public.business.
--
-- A business and its owning membership must be created together — a business
-- with no member is invisible to everyone and unrecoverable through the API,
-- and a client-side insert cannot guarantee the second statement runs. This
-- function makes the pair atomic.
--
-- SECURITY DEFINER, but it reads auth.uid() itself rather than accepting a user
-- id, so it cannot be called to create a business on someone else's behalf.

-- `selected_plan` records which plan the customer clicked, nothing more. It
-- grants no entitlement: subscription_status is the gate, and only the Stripe
-- webhook (service role) may set it. That separation matters because a user can
-- edit their own auth metadata, so the plan arriving here is an expression of
-- intent that must never be trusted as proof of payment.
create or replace function public.create_business_for_current_user(
  business_name text,
  selected_plan text default 'starter'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_business_id uuid;
  safe_plan text := coalesce(selected_plan, 'starter');
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if business_name is null or length(trim(business_name)) = 0 then
    raise exception 'Business name is required';
  end if;

  if safe_plan not in ('starter', 'pro', 'business') then
    safe_plan := 'starter';
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
