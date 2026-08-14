import type { MetadataRoute } from "next";

/**
 * What makes FlowPilot installable on a phone.
 *
 * Not an App Store build — no developer account, no review, no wait. A manifest
 * is what lets a browser put an icon on somebody's home screen that opens the
 * dashboard full-screen, with no address bar. To a tradesperson that is an app,
 * because everything they do with it is the same.
 *
 * It matters more here than it would for most products. FlowPilot earns its
 * keep in the ninety seconds after a missed call, standing in a customer's
 * kitchen — and a thing you reach by typing a URL is a thing you stop reaching
 * for. An icon beside WhatsApp gets opened every morning.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FlowPilot — your receptionist",
    /*
     * Short enough to survive a home screen without an ellipsis. iOS truncates
     * around twelve characters and Android is not much kinder, and "FlowPilo…"
     * under an icon looks broken rather than busy.
     */
    short_name: "FlowPilot",
    description:
      "Every call your receptionist has taken, and the diary it feeds.",

    /*
     * Straight to the jobs list, not the marketing homepage.
     *
     * Somebody who has installed this has already bought it. Opening the icon
     * onto a sales page would be absurd — and middleware sends them to sign in
     * first if the session has gone, then back here, so this is safe as a
     * starting point whatever state they are in.
     */
    start_url: "/dashboard",
    scope: "/",

    /*
     * `standalone` is what removes the browser chrome. Without it the icon
     * opens a tab with an address bar and it reads as a bookmark, which is
     * exactly what it should not feel like.
     */
    display: "standalone",
    orientation: "portrait",

    // Matches the app's own background, so the launch screen does not flash
    // white before the first paint on a dark UI.
    background_color: "#09090b",
    theme_color: "#09090b",

    icons: [
      {
        src: "/app-icon/192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/app-icon/512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      /*
       * The same images offered as maskable, so Android crops them into its own
       * shape rather than dropping a square icon onto a round launcher with a
       * white border around it. The glyph is inset for exactly this.
       */
      {
        src: "/app-icon/192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/app-icon/512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
