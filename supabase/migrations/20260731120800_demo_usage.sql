-- Rate limiting for the public demo on the marketing site.
--
-- The demo calls a paid model from a page anyone can load, so it needs a cap
-- that survives across serverless instances. An in-memory counter would reset
-- on every cold start, which on Vercel means it barely limits anything.
--
-- Stores a hash of the caller's IP, never the address itself. The point is to
-- count requests, and a hash counts just as well without keeping a record of
-- who visited the site.

create table public.demo_usage (
  ip_hash text primary key,
  request_count integer not null default 0,
  window_started_at timestamptz not null default now()
);

-- Written only by the demo endpoint using the service role. No policy grants
-- access to anyone else; RLS with no policy denies everything, which is exactly
-- right for a table no user should ever read.
alter table public.demo_usage enable row level security;

create index demo_usage_window_idx on public.demo_usage(window_started_at);

comment on table public.demo_usage is
  'Rate limiting for the public marketing demo. Hashed IPs only, pruned by age.';
