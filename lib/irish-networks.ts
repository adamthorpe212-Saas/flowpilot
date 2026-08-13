/**
 * Which Irish network a mobile is on, and what that means for forwarding.
 *
 * Detected rather than asked. A dropdown on the onboarding form is a question a
 * customer can answer wrong — plenty of people on gomo will say "Eir" and
 * plenty on 48 will say "Three" — and a wrong answer here produces confidently
 * wrong instructions, which is worse than none. Twilio's Lookup already knows,
 * from a number they have to type anyway.
 *
 * Lookup reports the HOST network, not the retail brand: a gomo number comes
 * back as "Meteor" because gomo runs on Eir's network. That is the more useful
 * answer, because forwarding behaviour follows the host, and it is why the
 * resellers are listed against their host rather than as networks of their own.
 *
 * What this deliberately does NOT do is carry per-network dial codes. The GSM
 * codes are a standard and are identical on every Irish network; inventing
 * network-specific variants would be fabricating detail that sounds helpful and
 * sends people down blind alleys. What genuinely differs is whether the
 * combined `**004*` code is honoured, which is what `combinedCodeUnreliable`
 * records — and since FlowPilot no longer uses that code, this is now
 * reassurance rather than instruction.
 */

export type IrishNetwork = {
  id: "vodafone" | "three" | "eir";
  /** The host network's own name, as a customer would recognise it. */
  name: string;
  /** Retail brands running on this network, for "you're on one of these". */
  resellers: string[];
  /**
   * Whether `**004*` is known to report success and forward nothing here.
   *
   * True for every host, because the failure is consistently on the resellers
   * and we cannot tell a reseller from its host by number alone. Recorded so
   * the reason the setup uses two codes stays written down next to the fact
   * that made it necessary.
   */
  combinedCodeUnreliable: boolean;
};

const NETWORKS: IrishNetwork[] = [
  {
    id: "vodafone",
    name: "Vodafone",
    resellers: ["Clear Mobile", "An Post Mobile"],
    combinedCodeUnreliable: true,
  },
  {
    id: "three",
    name: "Three",
    resellers: ["48", "Tesco Mobile", "Lycamobile"],
    combinedCodeUnreliable: true,
  },
  {
    id: "eir",
    name: "Eir",
    resellers: ["gomo"],
    combinedCodeUnreliable: true,
  },
];

/**
 * Maps what Twilio Lookup returns onto a host network.
 *
 * Matched on substrings because the carrier strings are inconsistent and change
 * without notice — "Meteor", "Eir Mobile", "Vodafone Ireland plc", "Hutchison
 * 3G Ireland Ltd" have all appeared. Returning null is a perfectly good answer:
 * the instructions are identical either way, so an unrecognised carrier costs a
 * line of reassurance and nothing else.
 */
export function networkFromCarrier(
  carrierName: string | null | undefined,
): IrishNetwork | null {
  if (!carrierName) return null;
  const name = carrierName.toLowerCase();

  // Meteor is Eir's old network name and is still what Lookup reports for both
  // Eir and gomo numbers.
  if (name.includes("meteor") || name.includes("eir")) {
    return NETWORKS.find((n) => n.id === "eir") ?? null;
  }
  if (name.includes("vodafone")) {
    return NETWORKS.find((n) => n.id === "vodafone") ?? null;
  }
  // Three trades as both "Three Ireland" and "Hutchison 3G Ireland".
  if (name.includes("three") || name.includes("hutchison")) {
    return NETWORKS.find((n) => n.id === "three") ?? null;
  }

  return null;
}

/**
 * The one line shown above the dial codes.
 *
 * Says the network by name and names its resellers, because somebody on gomo
 * being told "Eir" will otherwise assume we have got it wrong and stop trusting
 * the rest of the page.
 */
export function networkReassurance(network: IrishNetwork | null): string {
  if (!network) {
    return "These are standard network codes and work on every Irish network.";
  }

  return `Looks like you're on ${network.name}${
    network.resellers.length > 0
      ? ` (or ${network.resellers.join(", ")}, which run on it)`
      : ""
  }. These codes work there.`;
}
