-- ---------------------------------------------------------------------------
-- Turning the receptionist off for a while
--
-- A tradesperson on holiday, or having a week where he wants his own phone
-- back, needs a switch. Without one the only way to stop FlowPilot answering is
-- to dial ##002# and clear forwarding at the carrier — which also wipes the
-- network voicemail we told him to turn off during setup, and leaves him
-- re-dialling two codes to come back. That is not a setting, it is a
-- workaround.
--
-- A column rather than a new business.status value. `status` distinguishes
-- onboarding, active and suspended, and suspended means WE stopped the account
-- — a billing or abuse decision that the customer cannot undo. Overloading it
-- with a state the customer controls would make "why is this account not
-- answering" a question with two very different answers and one field.
--
-- Nullable timestamp rather than a boolean, because when it was paused is worth
-- knowing. A receptionist quietly off for three weeks is the most likely
-- explanation for "I'm not getting any jobs", and a date answers that
-- immediately where a boolean starts a conversation.
-- ---------------------------------------------------------------------------

alter table public.business
  add column receptionist_paused_at timestamptz;

comment on column public.business.receptionist_paused_at is
  'When the owner paused the receptionist. Null means it is answering. Distinct from status = suspended, which is our decision rather than theirs.';
