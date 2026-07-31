-- Bootstrap a new business with a profile and a working questionnaire.
--
-- A trigger rather than application code, because business_profile is 1:1 and
-- required — the AI cannot answer a call without it. Making that an invariant
-- of the database means no provisioning path, present or future, can create a
-- business that is unable to take calls.
--
-- The default questions are deliberately industry-agnostic. They are also
-- deliberately *present*: docs/BUSINESS-PROFILE.md notes that an empty
-- questionnaire on day one is how onboarding gets abandoned. A business edits
-- these rather than authoring them from nothing.
--
-- Services are NOT seeded. They are inherently specific to the business, and a
-- wrong guess ("boiler repair" for a cleaning company) is worse than an empty
-- list the onboarding flow explicitly asks them to fill.

create or replace function public.bootstrap_business()
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
    (new.id, 'Can you tell me what the job is?',        'job_type',       true,  1),
    (new.id, 'And whereabouts are you based?',          'location',       true,  2),
    (new.id, 'Is this an emergency, or can it wait?',   'urgency',        true,  3),
    (new.id, 'Can I take your name?',                   'contact_name',   true,  4),
    (new.id, 'When would suit you best?',               'preferred_time', false, 5);

  return new;
end;
$$;

create trigger business_bootstrap
  after insert on public.business
  for each row execute function public.bootstrap_business();
