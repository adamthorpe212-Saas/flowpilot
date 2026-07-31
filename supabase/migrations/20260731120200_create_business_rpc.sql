-- Creating a business is deliberately not an INSERT policy on public.business.
--
-- A business and its owning membership must be created together — a business
-- with no member is invisible to everyone and unrecoverable through the API,
-- and a client-side insert cannot guarantee the second statement runs. This
-- function makes the pair atomic.
--
-- SECURITY DEFINER, but it reads auth.uid() itself rather than accepting a user
-- id, so it cannot be called to create a business on someone else's behalf.

create or replace function public.create_business_for_current_user(
  business_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_business_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if business_name is null or length(trim(business_name)) = 0 then
    raise exception 'Business name is required';
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

  insert into public.business (name)
  values (trim(business_name))
  returning id into new_business_id;

  insert into public.business_member (business_id, user_id, role)
  values (new_business_id, current_user_id, 'owner');

  return new_business_id;
end;
$$;

revoke all on function public.create_business_for_current_user(text) from public;
grant execute on function public.create_business_for_current_user(text) to authenticated;
