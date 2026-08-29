import { ImageResponse } from "next/og";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

export const alt = "Sip Stories — India’s anonymous tasting room";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logoData = await readFile(
    join(process.cwd(), "public/brand/sipstories-mark-dark.png"),
    "base64",
  );
  const logoSrc = `data:image/png;base64,${logoData}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "linear-gradient(145deg, #3c160b 0%, #1b0e0a 68%, #100807 100%)",
        color: "#fff7e9",
        padding: "72px 84px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <img src={logoSrc} width={70} height={100} alt="" />
        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, letterSpacing: -2 }}>
          <span style={{ color: "#f45a14", fontStyle: "italic" }}>Sip</span>
          <span>&nbsp;Stories</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700, letterSpacing: -3 }}>
          Pull up a stool.
        </div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 31, color: "#d9bd9d" }}>
          India’s anonymous tasting room — stories, bars, cocktails, and James on call.
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 22, color: "#a98c72" }}>
        For adults of legal drinking age only. Drink responsibly.
      </div>
    </div>,
    size,
  );
}
