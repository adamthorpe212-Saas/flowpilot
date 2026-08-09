-- Asks when the job needs doing, before asking whether it's an emergency.
--
-- The default questions a new business got were built emergency-first:
--
--   3. "Is this an emergency, or can it wait?"  urgency         REQUIRED
--   5. "When would suit you best?"              preferred_time  optional
--
-- That is the wrong shape for the work these businesses actually do. Most of it
-- is planned — a rewire booked for a fortnight's time, a bathroom in March, a
-- job someone wants done before the in-laws visit. For a planned job the date is
-- the field that decides whether you can take it, and it was the one field the
-- receptionist was allowed to skip. Meanwhile every caller was asked to classify
-- their own job as an emergency, which is a question that only makes sense to a
-- business that sells emergency call-outs.
--
-- So they swap. Timing becomes required and is asked third, while the caller is
-- still describing the job. Urgency stays — a burst pipe genuinely is urgent and
-- the notification rules still route on it — but it moves last and becomes
-- optional, which is what it is: useful when it comes up, not worth interrogating
-- someone about.
--
-- lead.urgency is `not null default 'normal'`, so a call that never establishes
-- urgency still writes a valid row and still notifies. Nothing downstream needs
-- to change.
--
-- New businesses only. Existing rows are left alone deliberately: a business may
-- have edited its own questions in settings, and overwriting somebody's wording
-- to correct a default we shipped would be a worse trespass than the default.

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
