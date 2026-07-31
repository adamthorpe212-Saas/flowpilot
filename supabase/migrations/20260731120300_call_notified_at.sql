-- Track notification separately from call completion.
--
-- These were conflated, and the bug it caused was silent and total: the turn
-- handler marks a call completed when the conversation ends, and the status
-- callback treated "already completed" as "already dealt with" — so it skipped
-- notifications for every normally-finished call. The confirmation text and the
-- job alert, which are the entire point of the product, were never sent.
--
-- A call being over and its notifications having gone out are different facts
-- and now have different columns.

alter table public.call
  add column notified_at timestamptz;

comment on column public.call.notified_at is
  'When the confirmation SMS and owner alert were sent. Claimed atomically so a retried Twilio status callback cannot notify twice.';
