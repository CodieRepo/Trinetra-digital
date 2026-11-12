import test from "node:test";
import assert from "node:assert/strict";
import { getMediaUrl } from "../../src/lib/media";

test("getMediaUrl falls back to relative path when NEXT_PUBLIC_MEDIA_CDN_URL is unset", () => {
  const prev = process.env.NEXT_PUBLIC_MEDIA_CDN_URL;
  delete process.env.NEXT_PUBLIC_MEDIA_CDN_URL;
  try {
    assert.equal(getMediaUrl("/videos/why-tinetra.mp4"), "/videos/why-tinetra.mp4");
    assert.equal(getMediaUrl("videos/why-tinetra.mp4"), "/videos/why-tinetra.mp4");
  } finally {
    if (prev !== undefined) process.env.NEXT_PUBLIC_MEDIA_CDN_URL = prev;
  }
});

test("getMediaUrl prefixes normalized R2 CDN URL when NEXT_PUBLIC_MEDIA_CDN_URL is configured", () => {
  const prev = process.env.NEXT_PUBLIC_MEDIA_CDN_URL;
  process.env.NEXT_PUBLIC_MEDIA_CDN_URL = "https://media.trinetradigitalsolution.com/";
  try {
    assert.equal(
      getMediaUrl("/videos/why-tinetra.mp4"),
      "https://media.trinetradigitalsolution.com/videos/why-tinetra.mp4"
    );
    assert.equal(
      getMediaUrl("hero-sequence/frame_"),
      "https://media.trinetradigitalsolution.com/hero-sequence/frame_"
    );
  } finally {
    if (prev !== undefined) process.env.NEXT_PUBLIC_MEDIA_CDN_URL = prev;
    else delete process.env.NEXT_PUBLIC_MEDIA_CDN_URL;
  }
});
