import { ImageResponse } from "next/og";

/**
 * The card someone sees when a link to FlowPilot is pasted into WhatsApp.
 *
 * That matters more here than for most products: trades find each other by word
 * of mouth, and the realistic first contact is one plumber sending another a
 * link. A blank preview looks like a dead site, which is a poor first
 * impression for something asking to answer your phone.
 *
 * Generated rather than a checked-in PNG so the wording cannot drift from the
 * page, and drawn with system fonts so the build has nothing to fetch.
 */

export const alt =
  "FlowPilot — the AI receptionist that answers the calls you miss";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          backgroundColor: "#09090b",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#a1a1aa",
          }}
        >
          FlowPilot
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 76,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            color: "#ffffff",
            maxWidth: 900,
          }}
        >
          Never feel guilty about a missed call again.
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 30,
            lineHeight: 1.4,
            color: "#a1a1aa",
            maxWidth: 820,
          }}
        >
          Your AI receptionist answers, finds out what the job is, and sends it
          straight to your phone.
        </div>
      </div>
    ),
    size,
  );
}
