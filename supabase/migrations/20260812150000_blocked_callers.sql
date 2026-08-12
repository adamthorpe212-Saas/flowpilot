-- ---------------------------------------------------------------------------
-- Callers the receptionist should never answer
--
-- Two different people ask for this and they want the same mechanism. The
-- tradesman whose wife rings and hears "Hello, Byrne Plumbing, sorry we missed
-- your call" — that is the moment the product feels like it took something
-- over rather than helped. And the one getting six scam calls a week who does
-- not want a job record created for any of them.
--
-- Worth being precise about what this can do. By the time a call arrives here
-- it has already been missed: their phone rang, they did not pick up, and the
-- carrier forwarded it. So blocking cannot mean "put them through" — that has
-- already failed. It means we do not answer, and the call falls back to
-- whatever their carrier does with an unanswered forward.
--
-- Stored per business rather than globally. One person's spam is another's
-- supplier, and a shared blocklist would be us making that call for them.
-- ---------------------------------------------------------------------------

create table public.blocked_caller (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business(id) on delete cascade,

  -- E.164, normalised on the way in. Matching a number typed four different
  -- ways is the whole job here, so the normalising happens once at write time
  -- rather than on every inbound call.
  number text not null,

  -- "Sarah", "that scam crowd". Optional, and only ever shown to the owner —
  -- it exists so a list of bare numbers is still readable in six months.
  label text,

  /*
   * Proof it is working.
   *
   * Without this a blocklist is a promise with no evidence: somebody adds a
   * number and can never tell whether it did anything. A count and a date turn
   * it into "blocked 3 times, last Tuesday", which is also how they notice
   * they have blocked the wrong number.
   */
  blocked_count integer not null default 0,
  last_blocked_at timestamptz,

  created_at timestamptz not null default now(),

  -- The same number twice in one list is a no-op with a confusing UI. Adding
  -- an existing number updates the label instead of creating a duplicate.
  unique (business_id, number)
);

create index blocked_caller_business_id_idx
  on public.blocked_caller(business_id);

/*
 * The lookup every inbound call makes, before answering.
 *
 * Deliberately covering: the incoming route asks "is this exact number blocked
 * for this business", and this index answers it without touching the table.
 * It sits in front of the most latency-sensitive path in the product — a
 * caller is listening to silence while it runs.
 */
create index blocked_caller_lookup_idx
  on public.blocked_caller(business_id, number);

alter table public.blocked_caller enable row level security;

-- Owned entirely by the business, like notification rules. The server reads it
-- through the admin client during a call, which bypasses RLS by design.
create policy blocked_caller_all_own on public.blocked_caller
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));
