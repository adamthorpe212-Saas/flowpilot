-- Track which trial reminders have been sent.
--
-- The trial now genuinely expires, which means a customer's receptionist stops
-- answering on a schedule. Without a warning, the first they know of it is a
-- quiet week and a customer who rang someone else — and the dashboard banner
-- only helps people who happen to log in, which is exactly the group least
-- likely to notice.
--
-- A single column rather than a table of sends: there are only ever two
-- reminders per trial, and the question being asked is "what was the last thing
-- we told them", not "what is the history".

alter table public.business
  add column trial_reminder_stage text
    check (trial_reminder_stage in ('ending_soon', 'expired'));

comment on column public.business.trial_reminder_stage is
  'Last trial reminder sent, so the daily job cannot send the same one twice.';

-- Only the service role may write it: it is set by a scheduled job, and a
-- customer clearing it would make the job email them again.
revoke update on public.business from authenticated;

grant update (
  name,
  industry_label,
  service_area,
  timezone
) on public.business to authenticated;
