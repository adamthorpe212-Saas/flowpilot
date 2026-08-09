-- FlowPilot — migrations to apply, 2026-08-09
--
-- Paste this whole file into the Supabase SQL Editor and press Run.
--
-- Safe to run twice: every statement is idempotent, so if you are unsure
-- whether part of it already went in, just run the lot again.
--
-- What it does:
--   1. Drops call.recording_url — a column that promised call recording, which
--      FlowPilot has never done. Every row is null.
--   2. Changes the questions a NEW business is seeded with, so the receptionist
--      asks when a job needs doing (required) before asking whether it is
--      urgent (now optional). Existing businesses are untouched.
--   3. Adds call.delivered_at, so a job that reached nobody is visible instead
--      of looking identical to one delivered perfectly.
--   4. Adds lead.code, the short id behind the /j/<code> link in every job text.
--   5. Takes the em dash out of the confirmation text. It is not in the GSM-7
--      alphabet, which forced every SMS into UCS-2 at 70 characters a segment
--      instead of 160 — billing two or three segments to carry one sentence.
--      Businesses that wrote their own wording keep it.

-- 1 ---------------------------------------------------------------------------
alter table public.call drop column if exists recording_url;

-- 2 ---------------------------------------------------------------------------
create or replace function public.handle_new_business()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.business_profile (business_id)
  values (new.id);

  insert into public.qualification_question
    (business_id, prompt, captures, required, sort_order)
  values
    (new.id, 'Can you tell me what the job is?',          'job_type',       true,  1),
    (new.id, 'And whereabouts are you based?',            'location',       true,  2),
    (new.id, 'When are you hoping to get it done?',       'preferred_time', true,  3),
    (new.id, 'Can I take your name?',                     'contact_name',   true,  4),
    (new.id, 'Is it urgent, or can it wait?',             'urgency',        false, 5);

  return new;
end;
$$;

-- 3 ---------------------------------------------------------------------------
alter table public.call
  add column if not exists delivered_at timestamptz;

comment on column public.call.notified_at is
  'When delivery was attempted. Claimed atomically before sending, so a retried Twilio status callback cannot notify twice. NOT proof anything arrived - see delivered_at.';

comment on column public.call.delivered_at is
  'When at least one notification channel accepted a message for this call. Null alongside a set notified_at means the job was captured and reached nobody.';

-- 4 ---------------------------------------------------------------------------
alter table public.lead
  add column if not exists code text not null
  default translate(encode(gen_random_bytes(6), 'base64'), '+/=', 'xyz');

create unique index if not exists lead_code_idx on public.lead(code);

comment on column public.lead.code is
  'Short public-facing id used in the job alert link (/j/<code>). Not a secret - the route still requires a session and RLS still scopes the row.';

-- 5 ---------------------------------------------------------------------------
alter table public.business_profile
  alter column confirmation_sms_template
  set default 'Thanks {{caller_name}} - we have logged: {{job_type}}, {{location}}. {{business_name}} will be in touch shortly.';

update public.business_profile
set confirmation_sms_template =
  'Thanks {{caller_name}} - we have logged: {{job_type}}, {{location}}. {{business_name}} will be in touch shortly.'
where confirmation_sms_template =
  'Thanks {{caller_name}} — we have logged: {{job_type}}, {{location}}. {{business_name}} will be in touch shortly.';
