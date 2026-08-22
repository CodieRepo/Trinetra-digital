import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const manifest = {
    name: "Trinetra Restaurant OS",
    short_name: "Restaurant OS",
    description: "Commercial Operating System & Terminal for Restaurants",
    start_url: "/restaurant",
    scope: "/restaurant",
    display: "standalone",
    orientation: "any",
    background_color: "#070709",
    theme_color: "#070709",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ]
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600"
    }
  });
}
