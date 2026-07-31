import "server-only";

/**
 * Email delivery for job alerts.
 *
 * Exists because SMS alone leaves the product's core promise waiting on a
 * regulator. Outbound texts need a ComReg-registered sender ID, which takes
 * weeks to approve — and until it lands, a qualified job is captured perfectly
 * and the tradesperson is never told. Email needs no approval and works the day
 * the key is set, so it is the delivery path that can always be relied on.
 *
 * Uses Resend's REST API directly rather than their SDK. One endpoint, one
 * shape, and no dependency to keep current for the sake of a single POST.
 */

const API_URL = "https://api.resend.com/emails";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error(
      "Email is not configured. Set RESEND_API_KEY and EMAIL_FROM.",
    );
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [options.to],
      subject: options.subject,
      text: options.text,
    }),
  });

  if (!response.ok) {
    // Include the status and body: a rejected send is usually a misconfigured
    // sending domain, and the provider says so in the response.
    throw new Error(
      `Email send failed (${response.status}): ${await response.text()}`,
    );
  }
}
