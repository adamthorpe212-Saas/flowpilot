-- Smoke test for the migrations. Safe to run: everything is rolled back.
--
-- Run this in the Supabase SQL Editor immediately after applying the
-- migrations, before touching the app.
--
-- It exists because plpgsql function bodies cannot be checked statically.
-- `npm run validate:sql` parses the outer CREATE FUNCTION, but the body is just
-- a string literal to that parser — a typo'd variable inside it parses fine and
-- then fails the first time a real customer saves their services. This executes
-- the functions, which is the only way to know they work.
--
-- Expected: every NOTICE says OK, and the final SELECT returns no rows.

begin;

do $$
declare
  test_business_id uuid;
  profile_count integer;
  question_count integer;
  service_count integer;
  emergency_count integer;
  rule_count integer;
  rule_limit_enforced boolean := false;
begin
  -- The bootstrap trigger should create a profile and default questions.
  insert into public.business (name, plan)
  values ('Smoke Test Plumbing', 'starter')
  returning id into test_business_id;

  select count(*) into profile_count
  from public.business_profile where business_id = test_business_id;

  if profile_count <> 1 then
    raise exception 'FAIL: expected 1 business_profile, got %', profile_count;
  end if;
  raise notice 'OK: bootstrap created the business profile';

  select count(*) into question_count
  from public.qualification_question where business_id = test_business_id;

  if question_count < 1 then
    raise exception 'FAIL: expected default questions, got %', question_count;
  end if;
  raise notice 'OK: bootstrap created % default questions', question_count;

  -- replace_services: the loop, the ordering, and the emergency matching.
  perform public.replace_services(
    test_business_id,
    array['Burst pipe', 'Boiler service', 'Bathroom fitting'],
    array['burst pipe']
  );

  select count(*) into service_count
  from public.service where business_id = test_business_id;

  if service_count <> 3 then
    raise exception 'FAIL: expected 3 services, got %', service_count;
  end if;
  raise notice 'OK: replace_services inserted 3 services';

  select count(*) into emergency_count
  from public.service
  where business_id = test_business_id and emergency_eligible;

  if emergency_count <> 1 then
    raise exception 'FAIL: expected 1 emergency service, got %', emergency_count;
  end if;
  raise notice 'OK: emergency matching is case-insensitive';

  if not exists (
    select 1 from public.service
    where business_id = test_business_id
      and name = 'Bathroom fitting'
      and sort_order = 3
  ) then
    raise exception 'FAIL: sort_order was not applied correctly';
  end if;
  raise notice 'OK: sort_order follows the submitted order';

  -- Replacing again must not accumulate.
  perform public.replace_services(test_business_id, array['Just one'], array[]::text[]);

  select count(*) into service_count
  from public.service where business_id = test_business_id;

  if service_count <> 1 then
    raise exception 'FAIL: replace did not clear previous services, got %', service_count;
  end if;
  raise notice 'OK: replacing services clears the previous set';

  -- replace_sms_notification, twice, to prove it replaces rather than appends.
  perform public.replace_sms_notification(test_business_id, '+353871111111');
  perform public.replace_sms_notification(test_business_id, '+353872222222');

  select count(*) into rule_count
  from public.notification_rule
  where business_id = test_business_id and channel = 'sms';

  if rule_count <> 1 then
    raise exception 'FAIL: expected 1 sms rule, got %', rule_count;
  end if;
  raise notice 'OK: replace_sms_notification leaves exactly one rule';

  if not exists (
    select 1 from public.notification_rule
    where business_id = test_business_id and destination = '+353872222222'
  ) then
    raise exception 'FAIL: notification destination was not updated';
  end if;
  raise notice 'OK: notification destination updates in place';

  -- Column privileges: the guard against a customer granting themselves a
  -- free subscription. Row-level security cannot express this, so if the
  -- grants did not apply, nothing else would reveal it until someone tried.
  if exists (
    select 1 from information_schema.column_privileges
    where grantee = 'authenticated'
      and table_schema = 'public'
      and table_name = 'business'
      and privilege_type = 'UPDATE'
      and column_name in (
        'plan', 'subscription_status', 'status',
        'stripe_customer_id', 'stripe_subscription_id',
        'phone_number', 'phone_number_sid', 'forwarding_verified_at'
      )
  ) then
    raise exception 'FAIL: authenticated can still update billing or routing columns on business';
  end if;
  raise notice 'OK: customers cannot write billing or routing columns';

  if not exists (
    select 1 from information_schema.column_privileges
    where grantee = 'authenticated'
      and table_schema = 'public'
      and table_name = 'business'
      and privilege_type = 'UPDATE'
      and column_name = 'name'
  ) then
    raise exception 'FAIL: customers cannot edit their own business name';
  end if;
  raise notice 'OK: customers can still edit their own details';

  if exists (
    select 1 from information_schema.column_privileges
    where grantee = 'authenticated'
      and table_schema = 'public'
      and table_name = 'lead'
      and privilege_type = 'UPDATE'
      and column_name <> 'status'
  ) then
    raise exception 'FAIL: authenticated can rewrite captured lead details';
  end if;
  raise notice 'OK: lead details are read-only to customers';

  -- Shared-fate protections. Outbound SMS uses one registered sender ID for
  -- the whole platform, so one customer's abuse would cost every customer the
  -- feature.
  begin
    update public.business_profile
    set confirmation_sms_template = 'Click here now https://not-a-real-bank.example'
    where business_id = test_business_id;

    raise exception 'FAIL: a link was accepted in the confirmation template';
  exception
    when check_violation then
      raise notice 'OK: links are rejected in the confirmation template';
  end;

  begin
    update public.business_profile
    set confirmation_sms_template = repeat('x', 400)
    where business_id = test_business_id;

    raise exception 'FAIL: an over-long confirmation template was accepted';
  exception
    when check_violation then
      raise notice 'OK: confirmation template length is capped';
  end;

  /*
   * A flag rather than raising FAIL inside the block. The limit trigger raises
   * a plain exception, which is the same SQLSTATE a `raise exception 'FAIL'`
   * produces — so catching it here would swallow the failure message and
   * report a pass either way.
   */
  begin
    -- One rule already exists from the replacement test above.
    perform public.replace_sms_notification(test_business_id, '+353873333333');
    insert into public.notification_rule (business_id, channel, destination)
    select test_business_id, 'sms', '+35387400000' || generate_series(1, 8);
  exception
    when raise_exception then
      rule_limit_enforced := true;
  end;

  if not rule_limit_enforced then
    raise exception 'FAIL: unlimited notification rules were accepted';
  end if;
  raise notice 'OK: notification rules are capped per business';

  raise notice 'ALL CHECKS PASSED';
end;
$$;

-- Should return no rows: everything above is about to be rolled back.
select 'smoke test left data behind' as problem, id, name
from public.business
where name = 'Smoke Test Plumbing';

rollback;
