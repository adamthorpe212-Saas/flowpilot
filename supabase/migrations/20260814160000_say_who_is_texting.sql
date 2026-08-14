-- ---------------------------------------------------------------------------
-- Say whose receptionist is texting, before anything else
--
-- The confirmation goes to a stranger. Somebody rings a plumber, gets no
-- answer, and thirty seconds later an unfamiliar number is telling them their
-- own address. That reads as a scam unless the very first thing they see is the
-- name of the business they just rang — and the old wording opened "Thanks
-- {{caller_name}} - we have logged" and did not name the business until the
-- final clause, long after they had decided what it was.
--
-- It matters more than it should because Irish landline numbers cannot send SMS
-- at all. These go out from a US number and will keep doing so until a sender
-- ID is registered with ComReg, which needs a company registration the business
-- does not have yet. The wording cannot make the number Irish. It can make the
-- number make sense.
--
-- "No need to reply to this number" is literal, not manners: nothing handles
-- inbound SMS there, so a customer correcting a misheard address would be
-- typing into nowhere.
--
-- {{caller_name}} is dropped. It was frequently empty — callers ring off before
-- giving a name — and "Thanks  - we have logged" is a worse opening than none.
--
-- Every character stays inside GSM-7. One em dash would push the whole message
-- into UCS-2, where a segment is 70 characters rather than 160, doubling what
-- every confirmation costs to send.
-- ---------------------------------------------------------------------------

alter table public.business_profile
  alter column confirmation_sms_template
  set default '{{business_name}} automated receptionist. Your job is logged: {{job_type}}, {{location}}. You will get a call back - no need to reply to this number.';

-- Existing businesses that never customised theirs, moved across with it. A
-- business that wrote its own wording keeps it; only the untouched default is
-- replaced, matched exactly against both prior defaults.
update public.business_profile
set confirmation_sms_template =
  '{{business_name}} automated receptionist. Your job is logged: {{job_type}}, {{location}}. You will get a call back - no need to reply to this number.'
where confirmation_sms_template in (
  'Thanks {{caller_name}} - we have logged: {{job_type}}, {{location}}. {{business_name}} will be in touch shortly.',
  'Thanks {{caller_name}} — we have logged: {{job_type}}, {{location}}. {{business_name}} will be in touch shortly.'
);
