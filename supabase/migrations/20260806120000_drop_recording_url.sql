-- Removes a column that promised something FlowPilot does not do.
--
-- call.recording_url has existed since the initial schema and has never been
-- written to. No Twilio <Record> verb is used anywhere in the codebase: calls
-- are transcribed by <Gather input="speech">, not recorded. Every row is null
-- and always has been.
--
-- Dropped rather than left alone because of what it implies. docs/DATA-PROCESSING.md
-- tells anyone auditing this product that no audio is captured, and a column
-- called recording_url is precisely the thing that contradicts that at a glance
-- — to a solicitor, a data protection officer, or an engineer who assumes the
-- feature exists and starts relying on it. The schema should say what is true.
--
-- Reversible: if call recording is ever built, adding a column back is trivial,
-- and doing so deliberately is better than inheriting one nobody chose.

alter table public.call drop column if exists recording_url;
