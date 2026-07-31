-- FlowPilot initial schema
--
-- Multi-tenant from the first table. Every tenant-scoped table carries
-- business_id and ships with a row-level security policy in this same
-- migration — see docs/DECISIONS.md D3. Retrofitting RLS later is a migration
-- with a data-exposure window, and there is no reason to accept that when it is
-- free now.
--
-- Status and role columns use text + CHECK rather than Postgres enums.
-- Enums require an ALTER TYPE to extend and cannot drop values at all, which
-- makes every future plan tier or lead state a schema migration. The CHECK
-- constraint gives the same integrity with a far cheaper change path.

-- ---------------------------------------------------------------------------
-- Tenancy
-- ---------------------------------------------------------------------------

create table public.business (
  id uuid primary key default gen_random_uuid(),

  name text not null,

  -- Marketing and reporting only. Nothing in the application may branch on
  -- this — see docs/BUSINESS-PROFILE.md. A plumber and a cleaner differ in
  -- their configured data, never in a code path keyed off this column.
  industry_label text,

  -- Places served. Used to flag out-of-area jobs, never to refuse a caller.
  service_area text[] not null default '{}',

  timezone text not null default 'Europe/Dublin',

  -- Provisioned Twilio number. Null until onboarding completes.
  phone_number text unique,
  phone_number_sid text unique,

  -- Set once an automated test call has confirmed the customer's conditional
  -- forwarding actually works. Forwarding is configured on their handset and
  -- cannot be verified any other way.
  forwarding_verified_at timestamptz,

  -- Billing fields exist from day one even though nothing reads them until
  -- self-serve billing is built (docs/DECISIONS.md D5). This is what makes that
  -- phase additive rather than a data migration.
  plan text not null default 'starter'
    check (plan in ('starter', 'pro', 'business')),
  subscription_status text not null default 'incomplete'
    check (subscription_status in (
      'incomplete', 'trialing', 'active', 'past_due', 'canceled'
    )),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,

  status text not null default 'onboarding'
    check (status in ('onboarding', 'active', 'suspended')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Membership is its own table rather than an owner_id on business, so that
-- multi-user teams (roadmap Phase 7) are additive rather than a restructure.
create table public.business_member (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner'
    check (role in ('owner', 'dispatcher', 'technician')),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index business_member_user_id_idx on public.business_member(user_id);
create index business_member_business_id_idx on public.business_member(business_id);

-- ---------------------------------------------------------------------------
-- Membership lookup used by every policy below
--
-- SECURITY DEFINER so the function can read business_member without recursing
-- into that table's own RLS policy. STABLE so Postgres evaluates it once per
-- statement rather than once per row.
-- ---------------------------------------------------------------------------

create or replace function public.is_business_member(target_business_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.business_member
    where business_id = target_business_id
      and user_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- AI configuration
-- ---------------------------------------------------------------------------

create table public.business_profile (
  business_id uuid primary key references public.business(id) on delete cascade,

  -- Optional override of the default opening line.
  greeting text,

  tone text not null default 'Friendly, plain-spoken and brief. No jargon.',

  -- Defaults are deliberate. Quoting a price or promising an arrival time is
  -- how a receptionist costs a business money, and neither should depend on a
  -- customer remembering to switch it off.
  must_not text[] not null default array[
    'Never quote a price or estimate a cost.',
    'Never promise a specific arrival time.'
  ],

  fallback text not null default
    'I am not sure about that, but I will take your details and have someone come back to you.',

  closing_line text not null default
    'Thanks very much — someone will be in touch shortly.',

  confirmation_sms_template text not null default
    'Thanks {{caller_name}} — we have logged: {{job_type}}, {{location}}. {{business_name}} will be in touch shortly.',

  -- Hard stop so a confused or looping call cannot run up per-minute cost.
  max_call_seconds integer not null default 180
    check (max_call_seconds between 30 and 900),

  -- { "mon": { "open": "08:00", "close": "18:00" }, "sun": null }
  opening_hours jsonb not null default '{}'::jsonb,

  out_of_hours_behaviour text not null default 'answer_and_notify'
    check (out_of_hours_behaviour in (
      'answer_and_notify', 'answer_and_hold', 'do_not_answer'
    )),

  updated_at timestamptz not null default now()
);

-- The vocabulary the AI matches a caller's description against. This list is
-- the single biggest reason a plumber and a cleaner sound different without any
-- difference in code.
create table public.service (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business(id) on delete cascade,
  name text not null,
  emergency_eligible boolean not null default false,
  typical_urgency text not null default 'normal'
    check (typical_urgency in ('low', 'normal', 'high')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index service_business_id_idx on public.service(business_id);

create table public.qualification_question (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business(id) on delete cascade,
  prompt text not null,

  -- Which field of the lead this question fills. 'other' lands in lead.captured.
  captures text not null
    check (captures in (
      'job_type', 'location', 'urgency', 'contact_name', 'preferred_time', 'other'
    )),

  required boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index qualification_question_business_id_idx
  on public.qualification_question(business_id);

create table public.notification_rule (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business(id) on delete cascade,
  channel text not null check (channel in ('sms', 'email')),
  destination text not null,
  on_new_lead boolean not null default true,
  on_urgent_lead boolean not null default true,
  outside_hours boolean not null default true,
  created_at timestamptz not null default now()
);

create index notification_rule_business_id_idx
  on public.notification_rule(business_id);

-- ---------------------------------------------------------------------------
-- Calls and leads
--
-- Separate tables because they are not the same event. A call may produce no
-- lead at all (wrong number, immediate hangup), and keeping the call record
-- regardless is what makes "did it actually answer?" answerable.
-- ---------------------------------------------------------------------------

create table public.call (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business(id) on delete cascade,

  twilio_call_sid text unique,
  from_number text not null,
  to_number text not null,

  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,

  recording_url text,

  -- [{ "role": "assistant" | "caller", "text": "...", "at": "..." }]
  transcript jsonb not null default '[]'::jsonb,

  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'failed', 'no_answer')),

  created_at timestamptz not null default now()
);

create index call_business_id_started_at_idx
  on public.call(business_id, started_at desc);

create table public.lead (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business(id) on delete cascade,
  call_id uuid references public.call(id) on delete set null,

  caller_number text not null,
  caller_name text,

  job_type text,
  location text,
  preferred_time text,

  urgency text not null default 'normal'
    check (urgency in ('low', 'normal', 'high')),

  -- Answers to questions whose `captures` is 'other'. A jsonb column rather
  -- than a captured_field table: the standard fields above are universal across
  -- trades, and a separate row-per-answer table would add a join to every read
  -- for data that is only ever displayed alongside its lead.
  captured jsonb not null default '{}'::jsonb,

  -- Flagged, never used to refuse a caller — the business may well travel.
  out_of_area boolean not null default false,

  status text not null default 'new'
    check (status in ('new', 'qualified', 'contacted', 'booked', 'completed', 'lost')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lead_business_id_created_at_idx
  on public.lead(business_id, created_at desc);
create index lead_call_id_idx on public.lead(call_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger business_set_updated_at
  before update on public.business
  for each row execute function public.set_updated_at();

create trigger business_profile_set_updated_at
  before update on public.business_profile
  for each row execute function public.set_updated_at();

create trigger lead_set_updated_at
  before update on public.lead
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security
--
-- Enabled on every table. Server-side code that must write regardless of a user
-- session (the Twilio webhook handling a live call, the provisioning chain)
-- uses the service role key, which bypasses RLS by design.
-- ---------------------------------------------------------------------------

alter table public.business enable row level security;
alter table public.business_member enable row level security;
alter table public.business_profile enable row level security;
alter table public.service enable row level security;
alter table public.qualification_question enable row level security;
alter table public.notification_rule enable row level security;
alter table public.call enable row level security;
alter table public.lead enable row level security;

-- business: members read and update their own; creation goes through the
-- server, so there is deliberately no INSERT policy for end users.
create policy business_select_own on public.business
  for select using (public.is_business_member(id));

create policy business_update_own on public.business
  for update using (public.is_business_member(id))
  with check (public.is_business_member(id));

-- business_member: a user sees their own memberships. No self-service insert —
-- adding a member is a server-side operation so it can be authorised properly.
create policy business_member_select_own on public.business_member
  for select using (user_id = (select auth.uid()));

-- Configuration tables: members have full control over their own business.
create policy business_profile_all_own on public.business_profile
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy service_all_own on public.service
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy qualification_question_all_own on public.qualification_question
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy notification_rule_all_own on public.notification_rule
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

-- Calls are written by the system, never by a user. Read-only.
create policy call_select_own on public.call
  for select using (public.is_business_member(business_id));

-- Leads are created by the system; owners read them and update their status as
-- they work them through the pipeline.
create policy lead_select_own on public.lead
  for select using (public.is_business_member(business_id));

create policy lead_update_own on public.lead
  for update using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));
