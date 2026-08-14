-- ---------------------------------------------------------------------------
-- The owner may actually write the pause switch
--
-- 20260731120500 revoked UPDATE on public.business from authenticated and
-- granted it back one column at a time, so that a customer could not hand
-- themselves a free plan by writing `plan` or `subscription_status` directly.
-- That is the right shape, and it has a cost: every column added afterwards is
-- read-only to the owner until somebody remembers to grant it.
--
-- receptionist_paused_at was added in 20260814100000 and never granted. The
-- switch in Settings therefore failed for every customer with "permission
-- denied for column receptionist_paused_at" — the one control that answers
-- "is my phone being covered right now", rejected by the database.
--
-- Granted narrowly, to this column alone. It is the customer's decision by
-- definition: it is theirs to make, and it is distinct from status =
-- suspended, which is ours and stays service-role only.
-- ---------------------------------------------------------------------------

grant update (receptionist_paused_at) on public.business to authenticated;
