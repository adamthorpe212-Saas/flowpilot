-- Replace-in-place operations that must not be able to half-fail.
--
-- Both of these were previously a DELETE followed by an INSERT from the
-- application, as two separate round trips. A failure between them — a dropped
-- connection, a timeout, a constraint violation — left the business with
-- nothing: no services, so the receptionist has no vocabulary to match a caller
-- against; or no notification rule, so qualified jobs go nowhere at all.
--
-- Neither failure is visible to the customer. They would simply find that the
-- product had quietly stopped working properly.
--
-- A plpgsql function runs in a single transaction, so the delete and insert
-- either both happen or neither does.
--
-- SECURITY INVOKER (the default) is deliberate: row-level security still
-- applies, so passing another business's id changes nothing that isn't yours.

create or replace function public.replace_services(
  target_business_id uuid,
  service_names text[],
  emergency_names text[]
)
returns void
language plpgsql
set search_path = public
as $$
declare
  service_name text;
  sort_position integer := 0;
  is_emergency boolean;
begin
  delete from public.service where business_id = target_business_id;

  foreach service_name in array coalesce(service_names, '{}')
  loop
    sort_position := sort_position + 1;

    is_emergency := exists (
      select 1
      from unnest(coalesce(emergency_names, '{}')) as candidate
      where lower(candidate) = lower(service_name)
    );

    insert into public.service
      (business_id, name, emergency_eligible, typical_urgency, sort_order)
    values (
      target_business_id,
      service_name,
      is_emergency,
      case when is_emergency then 'high' else 'normal' end,
      sort_position
    );
  end loop;
end;
$$;

create or replace function public.replace_sms_notification(
  target_business_id uuid,
  sms_destination text
)
returns void
language plpgsql
set search_path = public
as $$
begin
  delete from public.notification_rule
  where business_id = target_business_id
    and channel = 'sms';

  insert into public.notification_rule
    (business_id, channel, destination, on_new_lead, on_urgent_lead, outside_hours)
  values (target_business_id, 'sms', sms_destination, true, true, true);
end;
$$;

revoke all on function public.replace_services(uuid, text[], text[]) from public;
grant execute on function public.replace_services(uuid, text[], text[]) to authenticated;

revoke all on function public.replace_sms_notification(uuid, text) from public;
grant execute on function public.replace_sms_notification(uuid, text) to authenticated;
