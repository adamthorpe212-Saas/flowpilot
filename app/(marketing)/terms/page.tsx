import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";
import { formatPrice, soldPlan, TRIAL_DAYS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Terms — FlowPilot",
  description:
    "The terms of using FlowPilot: what the service does, what it costs, how to cancel, and what it deliberately does not do.",
};

/**
 * Prices and allowances are imported, never typed out.
 *
 * Terms are the one page where a number that has drifted from reality is not
 * merely embarrassing — it is the document a customer would hold us to. The
 * price here is the same value the pricing page renders and the same one
 * diagnostics checks against Stripe.
 */
export default function TermsPage() {
  const plan = soldPlan();

  return (
    <LegalPage
      title="Terms"
      intro="The agreement between you and FlowPilot. Written to be read rather than skipped — it is short, and the parts that limit what we promise are in it plainly rather than buried."
    >
      <h2>Who you are contracting with</h2>
      <p>
        {LEGAL.entity}, {LEGAL.address}. Contact:{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>
      <p>
        FlowPilot is sold to businesses, not consumers. By signing up you confirm
        you are using it for a business.
      </p>

      <h2>What the service does</h2>
      <p>
        You keep your own phone number and set your handset to forward calls you
        do not answer. Those calls reach a phone number we provide, where an
        automated receptionist answers in your business&apos;s name, asks what
        the job is, where it is and when it is wanted, and sends the details to
        you by text and to your dashboard.
      </p>

      <h2>What it deliberately does not do</h2>
      <p>
        These are limits by design, not gaps we intend to close:
      </p>
      <ul>
        <li>It never quotes a price or estimates a cost</li>
        <li>It never promises a specific arrival time or books you in</li>
        <li>It never offers a service you have not told it you provide</li>
        <li>
          It is not an emergency service. It cannot dispatch anybody, and
          callers with an emergency should contact the emergency services
        </li>
      </ul>
      <p>
        Nothing FlowPilot says to a caller commits you to the work. Every job it
        takes is yours to accept or decline.
      </p>

      <h2>What it costs</h2>
      <p>
        <strong>{formatPrice(plan)} per month, excluding VAT.</strong> Your first{" "}
        {TRIAL_DAYS} days are free and no card is needed to set up. Billing is
        monthly in advance from the end of the trial.
      </p>
      <p>
        Fair use is {plan.callAllowance} answered calls a month. Calls you answer
        yourself never touch FlowPilot and are never counted. We will tell you
        before you get close, and your receptionist keeps answering — we do not
        cut anybody off mid-month. If you are consistently well over it we will
        talk to you before anything changes.
      </p>
      <p>
        Your Irish number and the calls it takes are included. There are no
        per-minute charges on top.
      </p>

      <h2>Cancelling</h2>
      <p>
        Any time, from your billing settings. There is no notice period and
        nobody to ring. Your receptionist keeps answering until the end of the
        month you have paid for, and we do not refund part-months.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>
          Set call forwarding up correctly on your own handset. We can only
          answer calls your network actually sends us
        </li>
        <li>
          Keep your notification details current, so jobs reach you
        </li>
        <li>
          Make sure what you configure the receptionist to say is accurate and
          lawful for your trade
        </li>
        <li>
          Deal with requests from your callers about their own data. You are the
          controller of it — see our{" "}
          <a href="/privacy">privacy policy</a>
        </li>
      </ul>

      <h2>Your callers&apos; data</h2>
      <p>
        When FlowPilot answers a call for you, you are the data controller for
        whatever that caller says and we are your processor. We only ever act on
        your instructions, we do not use your callers&apos; details for anything
        else, and we do not sell them.
      </p>
      <p>
        Every caller is told at the start of the call that they are speaking to
        an automated assistant taking their details. That cannot be switched
        off.
      </p>

      <h2>Availability</h2>
      <p>
        We work hard to keep it answering, but we do not offer a guaranteed
        uptime and we depend on other companies — chiefly our telephony provider
        — to carry the calls. FlowPilot is a safety net for calls you would
        otherwise miss, not a replacement for your own phone.
      </p>
      <p>
        We will give you reasonable notice of planned work that would interrupt
        the service.
      </p>

      <h2>Liability</h2>
      <p>
        Nothing here limits liability for death or personal injury caused by
        negligence, or for fraud.
      </p>
      <p>
        Otherwise, and to the extent the law allows, we are not liable for lost
        business, lost profit or lost opportunity — including work you did not
        win because a call was not answered or a job did not reach you. Our
        total liability in any twelve-month period is limited to the fees you
        paid us in that period.
      </p>

      <h2>Ending your account</h2>
      <p>
        We may suspend or close an account that is not paid for, that is being
        used unlawfully, or that is being used to send unsolicited messages. We
        will tell you why.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        If we change them materially we will let you know by email before it
        takes effect. If you do not accept a change, you can cancel.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of {LEGAL.country}, and the Irish
        courts have exclusive jurisdiction.
      </p>
    </LegalPage>
  );
}
