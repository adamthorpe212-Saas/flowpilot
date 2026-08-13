-- ---------------------------------------------------------------------------
-- The tradesman's diary
--
-- Written and edited by the business, only ever read by the receptionist. That
-- boundary is the point of the feature, not a limitation of it: an AI that can
-- write to somebody's calendar can double-book them, and a plumber ringing a
-- customer to cancel a job a robot agreed to is the failure that ends the
-- account. There is no code path that lets the receptionist insert here.
--
-- Days and parts of days, not clock times. A tradesman says "Thursday morning",
-- not "Thursday 09:15", and a part-of-day is enough for both things this table
-- exists to do — telling a customer when to expect him, and telling the
-- receptionist which days are already heavy. Exact times can be added later if
-- anybody actually asks; guessing now would build a precision the trade does
-- not work in.
--
-- lead_id is nullable on purpose. Half a tradesman's week never came through a
-- phone call — a regular customer, a foreman, his brother-in-law — and a diary
-- that only knows about FlowPilot leads would give the receptionist a
-- confidently wrong picture of how busy he is.
-- ---------------------------------------------------------------------------

create table public.appointment (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business(id) on delete cascade,

  /*
   * The job this came from, if it came from one.
   *
   * `on delete set null` rather than cascade: erasing a lead — which a caller
   * can request under GDPR — must not silently delete a job out of somebody's
   * diary. The appointment carries its own copy of the details it needs.
   */
  lead_id uuid references public.lead(id) on delete set null,

  scheduled_for date not null,
  slot text not null default 'anytime'
    check (slot in ('morning', 'afternoon', 'anytime')),

  /** What the job is, in his words. "Rewire kitchen". */
  title text not null,

  /*
   * Copied from the lead rather than joined to it, so the diary still reads
   * correctly after a lead is erased, and so a job added by hand can carry the
   * same details without inventing a lead to hang them off.
   */
  customer_name text,
  customer_number text,
  location text,
  notes text,

  /*
   * When the customer was told, and never set by the system on its own.
   *
   * The confirmation text goes out only when the owner taps send. It is a
   * message in his name to his customer, and one that fires unexpectedly is
   * how somebody stops trusting the whole feature.
   */
  customer_notified_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

/*
 * The two reads this table gets, and they are different shapes.
 *
 * The calendar page asks for one business's jobs from today forward. The
 * receptionist asks, mid-call with somebody on the line, which of the next
 * fortnight's days are already busy. Both are business_id then date, so one
 * index serves them.
 */
create index appointment_business_date_idx
  on public.appointment(business_id, scheduled_for);

alter table public.appointment enable row level security;

create policy appointment_all_own on public.appointment
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create trigger appointment_set_updated_at
  before update on public.appointment
  for each row execute function public.set_updated_at();
