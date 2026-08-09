import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Opening your job — FlowPilot",
  robots: { index: false },
};

/**
 * The link in a job alert.
 *
 * Lives inside the (app) group on purpose, so it inherits the same auth gate as
 * the dashboard: a tradesperson who taps this on a phone that is not signed in
 * gets the login screen and is returned here afterwards, rather than a 404 that
 * looks like the link was broken.
 *
 * It resolves the short code and forwards to the real job page rather than
 * rendering the job itself. One page owns what a job looks like; this one owns
 * only the question "which job is this", which keeps the two from drifting.
 *
 * The lookup runs under the signed-in user's session, so row-level security
 * decides what is visible. The code is short and therefore guessable, and that
 * is fine precisely because it is not what grants access — someone else's code
 * returns nothing to you.
 */
export default async function JobLinkPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("lead")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (lead?.id) redirect(`/dashboard/${lead.id}`);

  /*
   * Deliberately not a 404.
   *
   * Reaching here means signed in but no matching row — a link from a different
   * business's text, or a job since deleted. A bare "not found" invites somebody
   * to conclude their job vanished, which is the one thing this product must
   * never make anybody wonder. It says what is true and points at the list,
   * where their jobs actually are.
   */
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-semibold tracking-tight">
        We couldn&apos;t open that job
      </h1>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        The link may have been for a different account, or the job may have been
        deleted. Nothing else has been lost — everything your receptionist has
        taken is in your leads.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex min-h-12 items-center rounded-full bg-white px-6 text-[15px] font-semibold text-black transition hover:bg-zinc-200"
      >
        See all your jobs
      </Link>
    </div>
  );
}
