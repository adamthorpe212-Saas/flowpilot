-- Contain what one customer can do to every other customer.
--
-- Outbound SMS goes through a single ComReg-registered sender ID shared by the
-- whole platform, because registration is per-organisation and cannot be
-- automated per business. That makes it shared fate: the confirmation template
-- is customer-writable, has no UI (so the API is the only path and there is no
-- form to validate in), and its contents are delivered to third parties under
-- FlowPilot's name.
--
-- One customer sending smishing through it gets the registration revoked, and
-- SMS stops working for everyone. Ireland's Sender ID Registry exists
-- specifically to police that, so this is not a hypothetical failure mode.
--
-- These constraints live in the database rather than in application code
-- because RLS already permits direct API writes — anything enforced only in a
-- form is enforced only for people who use the form.

alter table public.business_profile
  add constraint confirmation_sms_template_length
    check (length(confirmation_sms_template) <= 320);

-- Links are the mechanism of virtually all smishing. A confirmation of details
-- the caller just gave over the phone has no legitimate need for one, and
-- allowing them is what gets a sender ID revoked.
alter table public.business_profile
  add constraint confirmation_sms_template_no_links
    check (confirmation_sms_template !~* '(https?://|www\.)');

-- Every notification rule is another SMS per lead, billed to FlowPilot. With
-- no cap, a customer could add hundreds and turn the platform into an SMS pump
-- at our expense. Five covers an owner, an office and a couple of vans.
create or replace function public.enforce_notification_rule_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  existing_count integer;
begin
  select count(*) into existing_count
  from public.notification_rule
  where business_id = new.business_id;

  if existing_count >= 5 then
    raise exception 'A business can have at most 5 notification rules';
  end if;

  return new;
end;
$$;

create trigger notification_rule_limit
  before insert on public.notification_rule
  for each row execute function public.enforce_notification_rule_limit();
