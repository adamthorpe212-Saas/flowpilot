import { ImageResponse } from "next/og";

/**
 * The home-screen icon, at whatever size the platform asks for.
 *
 * A web app manifest wants 192 and 512 square PNGs. The repository has a 64px
 * favicon and a 180px Apple touch icon — both too small, and the brand mark
 * itself is 480x384, which is not square and would be letterboxed into
 * something that looks like a mistake on somebody's home screen.
 *
 * Generated rather than checked in, the same way the Open Graph card is, so
 * there is one definition of what the icon looks like instead of four PNGs that
 * drift apart the first time the mark changes.
 *
 * Drawn rather than composed from the mark file: an ImageResponse cannot read a
 * local PNG without a fetch, and a build that fetches its own assets is a build
 * that fails when the site is down. The monogram is simple enough to draw.
 */

export const runtime = "edge";

/** Only the sizes a manifest actually references. */
const ALLOWED = new Set([192, 512]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: raw } = await params;
  const size = Number(raw.replace(/\.png$/, ""));

  if (!ALLOWED.has(size)) {
    return new Response("Not found", { status: 404 });
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          /*
           * Opaque, not transparent. Android masks icons into a circle or
           * squircle and fills whatever is behind them — a transparent
           * background there shows the launcher's own colour through the
           * corners, which on a dark brand reads as a rendering fault.
           */
          background: "#09090b",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size * 0.42,
            fontWeight: 700,
            letterSpacing: "-0.06em",
            color: "#ffffff",
            /*
             * Inset so the glyph survives Android's maskable crop, which can
             * take roughly a tenth off each edge. Sized against the icon rather
             * than fixed, so 192 and 512 are the same picture.
             */
            paddingBottom: size * 0.04,
          }}
        >
          FP
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
