-- Takes the em dash out of the confirmation text, because it triples the cost.
--
-- The default template opened "Thanks {{caller_name}} — we have logged". The em
-- dash does not exist in the GSM-7 alphabet, and one character outside GSM-7
-- forces the entire SMS into UCS-2 encoding, where a segment is 70 characters
-- rather than 160. Every confirmation FlowPilot has ever sent to a member of the
-- public has therefore been billed as two or three segments to carry one
-- sentence, and the same mistake was in the owner's job alert.
--
-- A hyphen is in GSM-7 and reads identically at a glance on a phone.
--
-- Existing businesses are migrated too, but only where they still have the old
-- default. Anyone who has written their own wording keeps it — correcting our
-- default is not licence to rewrite somebody's own words to their customers,
-- even to save them money.

alter table public.business_profile
  alter column confirmation_sms_template
  set default 'Thanks {{caller_name}} - we have logged: {{job_type}}, {{location}}. {{business_name}} will be in touch shortly.';

update public.business_profile
set confirmation_sms_template =
  'Thanks {{caller_name}} - we have logged: {{job_type}}, {{location}}. {{business_name}} will be in touch shortly.'
where confirmation_sms_template =
  'Thanks {{caller_name}} — we have logged: {{job_type}}, {{location}}. {{business_name}} will be in touch shortly.';
