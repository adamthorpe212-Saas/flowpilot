import LeadCard from "@/app/(app)/dashboard/LeadCard";
import PhoneFrame from "@/components/PhoneFrame";
import { previewLeads } from "@/lib/app-preview";

/**
 * The morning list, on a phone. The hero's proof that this is a real product.
 *
 * Renders the REAL LeadCard out of the dashboard against fixtures — not a
 * screenshot and not a hand-built imitation. Both go stale silently, and this
 * site has published a stale imitation four times: the disclosure line, the
 * default greeting, the animated phone, and the demo's fallback transcript.
 * A component imported from the app cannot drift from the app.
 *
 * Three cards, not one. A single card proves the format exists; a list proves
 * the thing a tradesperson is actually buying, which is that the jobs stop
 * living on the back of an envelope.
 */
export default function LeadInbox({ className }: { className?: string }) {
  const leads = previewLeads();
  const waiting = leads.filter((lead) => lead.status !== "booked").length;

  return (
    <PhoneFrame className={className ?? "h-[464px] w-[248px]"}>
      <div className="flex min-h-0 flex-1 flex-col px-2.5 pt-1">
        <p className="text-lg font-semibold tracking-tight">Jobs</p>
        <p className="mt-0.5 text-[11px] text-zinc-400">{waiting} waiting on you.</p>

        {/*
          Belt and braces, and both are load-bearing.

          `interactive={false}` is the real fix: the card renders with no
          anchors in it, so the public page emits no /dashboard/<id> for Next
          to prefetch and no tel: that could dial anybody. `inert` stays as the
          backstop in case a future field on this card arrives carrying a link
          of its own — this component has to be safe by default, because the
          thing it is protecting against is a stranger's phone ringing.
        */}
        <div inert className="mt-3 origin-top scale-[0.82] space-y-2.5">
          {leads.slice(0, 3).map((lead) => (
            <LeadCard key={lead.id} lead={lead} interactive={false} />
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}
