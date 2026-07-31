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

  raise notice 'ALL CHECKS PASSED';
end;
$$;

-- Should return no rows: everything above is about to be rolled back.
select 'smoke test left data behind' as problem, id, name
from public.business
where name = 'Smoke Test Plumbing';

rollback;
