export interface PostFormResponse {
  statusCode?: number;
  headers?: Record<string, string>;
  cookies?: string[];
  body?: string;
  error?: string;
}

/**
 * Edge-compatible replacement for Node `https.request` form POST used by BhashSMS sync.
 */
export async function postForm(
  urlStr: string,
  formData: Record<string, string>,
  cookieStr = "",
  refererUrl = "",
  fetchImpl: typeof fetch = fetch
): Promise<PostFormResponse> {
  try {
    const postData = new URLSearchParams(formData).toString();
    const res = await fetchImpl(urlStr, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": cookieStr,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": refererUrl || "https://digifast.site/dltstatus/bwa/Pages/login.php",
      },
      body: postData,
    });

    const body = await res.text();
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      headers[k] = v;
    });

    const headerObj = res.headers as unknown as { getSetCookie?: () => string[] };
    const rawSetCookie = res.headers.get("set-cookie");
    const cookies =
      typeof headerObj.getSetCookie === "function"
        ? headerObj.getSetCookie()
        : rawSetCookie
          ? [rawSetCookie]
          : undefined;

    return {
      statusCode: res.status,
      headers,
      cookies,
      body,
    };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Fetch error" };
  }
}
