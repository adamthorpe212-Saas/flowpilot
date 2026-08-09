-- Records whether a job actually reached the owner, not just that we tried.
--
-- `notified_at` is claimed atomically *before* anything is sent, which is the
-- right way to stop a retried Twilio status callback texting somebody twice. But
-- it is written whether or not a single message goes out, and its own comment
-- claimed it recorded "when the confirmation SMS and owner alert were sent".
-- That is not what it holds. If every channel fails, notified_at is set, nothing
-- retries, and any operator reading the row concludes the owner was told.
--
-- That gap is not theoretical. Email is the only regulator-free channel and is
-- not configured in production, so SMS is currently the single path to a
-- customer — and if an unregistered sender ID is rejected in Ireland, every job
-- fails to deliver while every row says otherwise. The first anyone would know
-- is a customer ringing to ask why FlowPilot has gone quiet, and there would be
-- nothing in the database to confirm or deny it.
--
-- Two columns for two facts:
--   notified_at  — we took the lock and attempted delivery (dedup)
--   delivered_at — at least one channel actually accepted the message
--
-- Deliberately not a retry mechanism. Retrying safely means knowing which
-- channel succeeded, and a wrong retry double-texts a customer, which is worse
-- than a missed one. This makes the failure visible first; acting on it is a
-- decision to take with evidence rather than a guess to build now.

alter table public.call
  add column if not exists delivered_at timestamptz;

comment on column public.call.notified_at is
  'When delivery was attempted. Claimed atomically before sending, so a retried Twilio status callback cannot notify twice. NOT proof anything arrived — see delivered_at.';

comment on column public.call.delivered_at is
  'When at least one notification channel accepted a message for this call. Null alongside a set notified_at means the job was captured and reached nobody.';
