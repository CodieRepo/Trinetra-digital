export interface CronWorkerEnv {
  APP_BASE_URL: string;
  JOB_SECRET_KEY: string;
  SCRAPER_SECRET: string;
}

export interface CronDispatchResult {
  ok: boolean;
  cron: string;
  results?: Array<{ endpoint: string; status: number }>;
  error?: string;
}

async function postOrGetJson(
  fetchImpl: typeof fetch,
  url: string,
  method: "GET" | "POST",
  bearerSecret?: string,
  bodyPayload: Record<string, unknown> = {}
): Promise<{ endpoint: string; status: number }> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": "trinetra-cron-worker/1.0",
  };
  if (bearerSecret) {
    headers["authorization"] = `Bearer ${bearerSecret}`;
  }

  const response = await fetchImpl(url, {
    method,
    headers,
    ...(method === "POST" ? { body: JSON.stringify(bodyPayload) } : {}),
  });

  if (!response.ok) {
    const snippet = await response.text().catch(() => "");
    console.error(`[trinetra-cron] ${method} ${url} failed (${response.status}): ${snippet.slice(0, 200)}`);
  }

  return { endpoint: url, status: response.status };
}

/**
 * Routes scheduled cron ticks to Trinetra outbox jobs, Supabase keep-alive health,
 * and BhashSMS lead synchronization.
 */
export async function runCronSchedule(
  cron: string,
  env: CronWorkerEnv,
  fetchImpl: typeof fetch = fetch
): Promise<CronDispatchResult> {
  const baseUrl = (env.APP_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!baseUrl) {
    return { ok: false, cron, error: "APP_BASE_URL is required" };
  }

  try {
    if (cron === "*/10 * * * *") {
      if (!env.SCRAPER_SECRET) {
        return { ok: false, cron, error: "SCRAPER_SECRET is required" };
      }
      const syncRes = await postOrGetJson(fetchImpl, `${baseUrl}/api/v1/bhash/sync`, "POST", env.SCRAPER_SECRET);
      return {
        ok: syncRes.status >= 200 && syncRes.status < 300,
        cron,
        results: [syncRes],
        ...(syncRes.status >= 300 ? { error: `Bhash sync returned HTTP ${syncRes.status}` } : {}),
      };
    }

    if (cron === "0 */6 * * *") {
      if (!env.JOB_SECRET_KEY) {
        return { ok: false, cron, error: "JOB_SECRET_KEY is required" };
      }
      const healthRes = await postOrGetJson(fetchImpl, `${baseUrl}/api/health`, "GET");
      const cleanupRes = await postOrGetJson(
        fetchImpl,
        `${baseUrl}/api/jobs/run`,
        "POST",
        env.JOB_SECRET_KEY,
        { mode: "cleanup" }
      );
      const allOk =
        healthRes.status >= 200 &&
        healthRes.status < 300 &&
        cleanupRes.status >= 200 &&
        cleanupRes.status < 300;
      return {
        ok: allOk,
        cron,
        results: [healthRes, cleanupRes],
        ...(allOk
          ? {}
          : { error: `Maintenance partial failure (health=${healthRes.status}, cleanup=${cleanupRes.status})` }),
      };
    }

    // Default / */2 * * * * — Notification outbox + Supabase keep-alive health check
    if (!env.JOB_SECRET_KEY) {
      return { ok: false, cron, error: "JOB_SECRET_KEY is required" };
    }

    const [jobsRes, healthRes] = await Promise.all([
      postOrGetJson(fetchImpl, `${baseUrl}/api/jobs/run`, "POST", env.JOB_SECRET_KEY),
      postOrGetJson(fetchImpl, `${baseUrl}/api/health`, "GET"),
    ]);

    const allOk = jobsRes.status >= 200 && jobsRes.status < 300 && healthRes.status >= 200 && healthRes.status < 300;
    return {
      ok: allOk,
      cron,
      results: [jobsRes, healthRes],
      ...(allOk ? {} : { error: `Cron partial failure (jobs=${jobsRes.status}, health=${healthRes.status})` }),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown cron error";
    console.error("[trinetra-cron] Dispatch exception:", message);
    return { ok: false, cron, error: message };
  }
}

export default {
  async scheduled(controller: { cron: string }, env: CronWorkerEnv, ctx: { waitUntil(p: Promise<unknown>): void }) {
    ctx.waitUntil(
      runCronSchedule(controller.cron, env).then((res) => {
        if (!res.ok) {
          console.error(`[trinetra-cron] Schedule ${controller.cron} failed:`, res.error);
        } else {
          console.log(`[trinetra-cron] Schedule ${controller.cron} ok:`, JSON.stringify(res.results));
        }
      })
    );
  },
};
