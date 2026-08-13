"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  saveMobile,
  startForwardingTest,
  type ForwardingState,
} from "@/app/(app)/onboarding/forwarding/actions";
import CopyButton from "@/components/ui/CopyButton";
import Field from "@/components/ui/Field";
import FormError from "@/components/ui/FormError";
import SubmitButton from "@/components/ui/SubmitButton";
import {
  busyForwardingCode,
  CANCEL_FORWARDING_CODE,
  CLEAR_FORWARDING_CODE,
  forwardingCode,
  forwardingTelHref,
  RING_SECONDS,
  unreachableForwardingCode,
} from "@/lib/phone";

const INITIAL: ForwardingState = { error: null };

/** How long to wait for a forwarded test call before offering help. */
const POLL_INTERVAL_MS = 3000;
const POLL_ATTEMPTS = 15;

export default function ForwardingStep({
  flowpilotNumber,
  mobile,
  verified,
}: {
  flowpilotNumber: string | null;
  mobile: string | null;
  verified: boolean;
}) {
  const [mobileState, saveMobileAction] = useActionState(saveMobile, INITIAL);
  const [testState, testAction] = useActionState(startForwardingTest, INITIAL);

  const router = useRouter();
  const [attempts, setAttempts] = useState<number | null>(null);

  const waiting = attempts !== null && attempts < POLL_ATTEMPTS && !verified;
  const gaveUp = attempts !== null && attempts >= POLL_ATTEMPTS && !verified;

  /*
   * Watch for the forwarded call arriving.
   *
   * Confirmation happens server-side, in the voice webhook — there is no signal
   * on this page when it lands. Without polling, a customer whose forwarding is
   * not set up correctly sees "we're ringing you now" and then nothing at all,
   * forever, on the one step most likely to go wrong.
   */
  useEffect(() => {
    // Counting starts in the submit handler, not here — initialising it from
    // inside the effect would be a synchronous setState that triggers an extra
    // render pass on every poll.
    if (attempts === null || verified) return;
    if (attempts >= POLL_ATTEMPTS) return;

    const id = setTimeout(() => {
      router.refresh();
      setAttempts((current) => (current ?? 0) + 1);
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(id);
  }, [verified, attempts, router]);

  if (!flowpilotNumber) {
    return (
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <p className="text-sm text-zinc-400">
          You need your FlowPilot number before you can forward to it.
        </p>
        <Link
          href="/onboarding/number"
          className="mt-4 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
        >
          Get my number
        </Link>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="mt-8">
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-6 text-center">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-300">
            Forwarding confirmed
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            We rang your phone and the call reached FlowPilot. Your receptionist
            is answering.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="mt-6 block rounded-xl bg-white px-5 py-3 text-center text-[15px] font-semibold text-black transition hover:bg-zinc-200"
        >
          Go to my leads
        </Link>
      </div>
    );
  }

  const code = forwardingCode(flowpilotNumber);

  return (
    <div className="mt-8 space-y-8">
      <section>
        <h2 className="text-sm font-medium text-zinc-300">
          1. Where should we send new jobs?
        </h2>
        <form action={saveMobileAction} className="mt-3 space-y-4">
          <FormError message={mobileState.error} />
          <Field
            label="Your mobile"
            name="mobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            defaultValue={mobile ?? ""}
            placeholder="087 123 4567"
            required
            hint="We text job details here, and ring this number to test forwarding."
          />
          <SubmitButton>{mobile ? "Update number" : "Save number"}</SubmitButton>
        </form>
      </section>

      {/*
        `inert`, not `pointer-events-none`.

        Dimming and killing pointer events stops a mouse and nothing else: a
        keyboard user could still tab into "Dial it now" and fire a test call
        from a step that looks plainly disabled, and a screen reader would read
        the whole thing out as though it were available. `inert` takes the
        subtree out of the focus order and the accessibility tree, which is what
        "not yet" actually means.
      */}
      <section inert={!mobile} className={mobile ? "" : "opacity-40"}>
        <h2 className="text-sm font-medium text-zinc-300">
          2. Turn on forwarding
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Two codes, on the phone you want forwarded. Both take a second and
          your network confirms each one.
        </p>

        {/*
          Clearing comes first, and it is not optional.

          This step used to be one code. It reported success and forwarded
          nothing, because carrier voicemail is itself a conditional forward —
          ours sat behind it and the network's own won every time. Setup looked
          finished and every call still went to voicemail, which is the worst
          way for the one unskippable step to fail.
        */}
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">
              First — clear your voicemail
            </p>
            <p className="mt-2 break-all text-center font-mono text-lg text-white">
              {CLEAR_FORWARDING_CODE}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <a
                href={forwardingTelHref(CLEAR_FORWARDING_CODE)}
                className="rounded-full border border-white/20 px-5 py-2 text-sm transition hover:bg-white/5"
              >
                Dial it now
              </a>
              <CopyButton value={CLEAR_FORWARDING_CODE} label="Copy" />
            </div>
            <p className="mt-4 text-center text-xs leading-5 text-zinc-500">
              This switches off your network voicemail. That&apos;s the point —
              voicemail is what&apos;s been swallowing your missed calls, and
              FlowPilot replaces it.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">
              Then — send missed calls to FlowPilot
            </p>
            <p className="mt-2 break-all text-center font-mono text-lg text-white">
              {code}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <a
                href={forwardingTelHref(code)}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                Dial it now
              </a>
              <CopyButton value={code} label="Copy code" />
            </div>
            <p className="mt-4 text-center text-xs leading-5 text-zinc-500">
              Your phone rings for {RING_SECONDS} seconds first. Anything you
              pick up never touches FlowPilot.
            </p>
          </div>
        </div>

        <p className="mt-3 text-center text-xs leading-5 text-zinc-500">
          On iPhone, tapping may not work — some codes have to be typed into the
          keypad by hand. Copy each one and dial it like a phone number.
        </p>

        <details className="mt-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <summary className="cursor-pointer text-sm text-zinc-400">
            Also catch calls when you&apos;re engaged or out of coverage
          </summary>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Optional. The code above covers calls you don&apos;t answer, which is
            almost all of them. These two cover the rest.
          </p>
          <div className="mt-3 space-y-2">
            <p className="break-all font-mono text-sm text-zinc-300">
              {busyForwardingCode(flowpilotNumber)}{" "}
              <span className="font-sans text-zinc-500">— when engaged</span>
            </p>
            <p className="break-all font-mono text-sm text-zinc-300">
              {unreachableForwardingCode(flowpilotNumber)}{" "}
              <span className="font-sans text-zinc-500">
                — phone off or no signal
              </span>
            </p>
          </div>
          <p className="mt-4 text-sm leading-6 text-zinc-400">
            These are standard network codes and work the same on every Irish
            network, including gomo, 48 and Tesco Mobile.
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            To turn FlowPilot off at any time, dial{" "}
            <span className="font-mono text-zinc-300">
              {CANCEL_FORWARDING_CODE}
            </span>
            . Your network voicemail won&apos;t come back on its own — you&apos;d
            need to re-enable it with your provider.
          </p>
        </details>
      </section>

      <section inert={!mobile} className={mobile ? "" : "opacity-40"}>
        <h2 className="text-sm font-medium text-zinc-300">3. Test it</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          We&apos;ll ring your phone. Don&apos;t answer — let it ring out, and
          we&apos;ll confirm the call reached us.
        </p>

        <form
          action={() => {
            // Restart the count on every attempt, or a second try would stay
            // stuck on "we didn't get that call" and never poll again.
            setAttempts(0);
            testAction();
          }}
          className="mt-4 space-y-4"
        >
          <FormError message={testState.error} />

          {waiting && (
            <p
              role="status"
              className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm text-zinc-200"
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 flex-none animate-pulse rounded-full bg-emerald-400 motion-reduce:animate-none"
              />
              Ringing you now — don&apos;t answer. Waiting for the call to reach
              us…
            </p>
          )}

          {gaveUp && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              <p className="font-medium">We didn&apos;t get that call.</p>
              <ul className="mt-2 space-y-1.5 text-amber-100/80">
                <li>
                  Did you dial the forwarding code above, and did your network
                  confirm it?
                </li>
                <li>
                  Did you answer the call? It has to ring out for us to see it.
                </li>
                <li>
                  If your phone went to voicemail first, voicemail is taking the
                  call instead — turn it off and try again.
                </li>
              </ul>
            </div>
          )}

          {!waiting && !gaveUp && testState.message && (
            <p
              role="status"
              className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm text-zinc-200"
            >
              {testState.message}
            </p>
          )}

          <SubmitButton>
            {gaveUp ? "Try the test again" : "Ring my phone"}
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
