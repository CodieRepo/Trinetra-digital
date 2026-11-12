/**
 * Resolves a public media asset path against NEXT_PUBLIC_MEDIA_CDN_URL (Cloudflare R2)
 * when configured, falling back to a local root-relative path in development.
 */
export function getMediaUrl(assetPath: string): string {
  const normalizedPath = assetPath.startsWith("/") ? assetPath : `/${assetPath}`;
  const cdnBase = (process.env.NEXT_PUBLIC_MEDIA_CDN_URL || "").trim().replace(/\/+$/, "");
  if (!cdnBase) {
    return normalizedPath;
  }
  return `${cdnBase}${normalizedPath}`;
}
