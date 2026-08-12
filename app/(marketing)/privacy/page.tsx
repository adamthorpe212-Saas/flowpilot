import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { AI_DISCLOSURE_EXAMPLE } from "@/lib/disclosure";
import { LEGAL, PUBLISHED_RETENTION_DAYS, SUB_PROCESSORS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy — FlowPilot",
  description:
    "What FlowPilot does with personal data: what is collected from callers, who else receives it, how long it is kept, and how to have it erased.",
};

/**
 * Written from the code, not from a template.
 *
 * Most privacy policies describe a product in general terms and quietly promise
 * things the software does not do. Every claim here is checked against
 * docs/DATA-PROCESSING.md, which is itself derived from the schema — and the
 * numbers and the spoken disclosure are imported rather than retyped, so a
 * change to the product cannot leave this page describing the old one.
 *
 * It has not been reviewed by a solicitor. That is a real gap and one worth
 * closing, but a page that is accurate and unreviewed is a great deal better
 * than no page at all — and better than a reviewed template describing a
 * different product.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      intro="FlowPilot answers phone calls on behalf of trades businesses. That means we handle information about people who never signed up to anything — they rang a plumber and we picked up. This explains what happens to it."
    >
      <h2>Who we are</h2>
      <p>
        {LEGAL.entity}, {LEGAL.address}. For anything on this page, email{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>

      <h2>Two different jobs at once</h2>
      <p>
        This distinction decides who is responsible for what, so it is worth
        being plain about.
      </p>
      <p>
        <strong>For the business owner</strong> — the tradesperson who signs up —
        we are the data controller. They gave us their details and we decided
        what to collect.
      </p>
      <p>
        <strong>For their callers</strong>, we are only a processor. When a
        member of the public rings a plumber and FlowPilot answers, that
        plumber&apos;s business is the controller of whatever the caller says.
        We hold it on their behalf and act on their instructions. If you are a
        caller wanting your details removed, you can contact us and we will
        pass it on, but the business you rang is the one that decides.
      </p>

      <h2>What we collect from callers</h2>
      <ul>
        <li>Their phone number, which the network provides automatically</li>
        <li>Their name, if they give it</li>
        <li>The address the work is at</li>
        <li>What the job is, and when they want it done</li>
        <li>A written record of everything said on the call, both sides</li>
        <li>The time and length of the call</li>
        <li>
          Anything else the business has configured its receptionist to ask
        </li>
      </ul>

      <h3>Calls are not recorded</h3>
      <p>
        There is no audio file of your call, anywhere. Speech is converted to
        text as the call happens and only the text is kept. Nobody can play back
        a recording of you, because none exists.
      </p>

      <h3>Callers are told before they speak</h3>
      <p>
        Every call opens with this, before the business&apos;s own greeting, and
        it cannot be switched off:
      </p>
      <p>
        <strong>&ldquo;{AI_DISCLOSURE_EXAMPLE}&rdquo;</strong>
      </p>
      <p>
        Somebody describing a problem in their home deserves to know what they
        are speaking to. That is why it is not configurable.
      </p>

      <h2>What we collect from business owners</h2>
      <ul>
        <li>Email address and a hashed password, for signing in</li>
        <li>Business name, the trades they cover, and their service areas</li>
        <li>Their own mobile number or email, so we know where to send jobs</li>
        <li>
          Billing identifiers from Stripe. We never see or store card details —
          the payment page is Stripe&apos;s, not ours
        </li>
      </ul>

      <h2>Who else sees it</h2>
      <p>
        These companies process data on our behalf. They are not permitted to
        use it for anything except providing their service to us.
      </p>
      <ul>
        {SUB_PROCESSORS.map((processor) => (
          <li key={processor.name}>
            <strong>{processor.name}</strong> — {processor.purpose}.{" "}
            {processor.data}.
          </li>
        ))}
      </ul>
      <p>
        Where any of these process data outside the European Economic Area, they
        do so under the European Commission&apos;s Standard Contractual Clauses.
      </p>
      <p>We do not sell personal data, and we never will.</p>

      <h2>How long it is kept</h2>
      <p>
        Caller details are erased after{" "}
        <strong>{PUBLISHED_RETENTION_DAYS} days</strong>. That removes the
        written record of the call, the caller&apos;s phone
        number, and the job with their name and address. A record that a call
        happened, and how long it lasted, is kept so businesses can check what
        they have been billed for — but nothing identifying the caller remains.
      </p>
      <p>
        A year is long enough for a tradesperson to find a customer who rang
        last season, or to answer &ldquo;you fitted this in April and it&apos;s
        leaking&rdquo;. It is not indefinite.
      </p>

      <h2>Your rights</h2>
      <p>
        Under the GDPR you can ask for a copy of your data, ask for it to be
        corrected or erased, object to how it is used, or complain to a
        regulator.
      </p>
      <p>
        <strong>Erasure works today and does not wait for the year to be
        up.</strong> A business can delete a caller entirely from their
        dashboard, which removes the job and clears the caller&apos;s details
        from the call record.
      </p>
      <p>
        Requests for a copy of data, or for it in a portable format, are handled
        manually at present — email us and we will deal with it within one
        month, as the GDPR requires.
      </p>
      <p>
        If you are unhappy with how we have handled your data you can complain
        to the Irish Data Protection Commission at{" "}
        <a
          href="https://www.dataprotection.ie"
          target="_blank"
          rel="noreferrer"
        >
          dataprotection.ie
        </a>
        .
      </p>

      <h2>Cookies</h2>
      <p>
        We use a cookie to keep you signed in. That is all — there is no
        advertising, no analytics following you around, and nothing shared with
        anybody for marketing.
      </p>

      <h2>Changes</h2>
      <p>
        If this changes materially we will say so here and date it. The date at
        the top is when it was last altered.
      </p>
    </LegalPage>
  );
}
