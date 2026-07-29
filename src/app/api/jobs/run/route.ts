import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { leadIngestionService } from "../../../../../services/leadIngestionService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase URL and Service Role Key are required environment variables");
  }
  return createClient(url, key);
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate Request using bearer token matching SUPABASE_SERVICE_ROLE_KEY
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    
    if (token !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn("JobRunner: Unauthorized request blocked.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenant_id");
    
    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant_id parameter" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    
    // 2. Fetch pending jobs ready to execute
    const { data: jobs, error: fetchError } = await supabaseAdmin
      .from("job_queue")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "pending")
      .lte("run_at", new Date().toISOString())
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("JobRunner: Database select error:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: "No pending jobs found." }, { status: 200 });
    }

    console.log(`JobRunner: Found ${jobs.length} jobs to process.`);

    for (const job of jobs) {
      // Mark job as processing
      await supabaseAdmin
        .from("job_queue")
        .update({ 
          status: "processing", 
          attempts: job.attempts + 1,
          updated_at: new Date().toISOString()
        })
        .eq("id", job.id);

      try {
        let success = false;
        
        if (job.job_type === "google_calendar_event") {
          success = await executeGoogleCalendarJob(job, supabaseAdmin);
        } else if (job.job_type === "n8n_webhook_dispatch") {
          success = await executeN8nWebhookJob(job, supabaseAdmin);
        } else if (job.job_type === "whatsapp_inbound_message") {
          success = await executeWhatsAppInboundJob(job);
        } else {
          console.warn(`JobRunner: Unknown job type: ${job.job_type}`);
          success = true; // complete to discard
        }

        if (success) {
          await supabaseAdmin
            .from("job_queue")
            .update({ 
              status: "completed", 
              updated_at: new Date().toISOString(),
              error_log: null
            })
            .eq("id", job.id);
        } else {
          // Calculate backoff delay
          const minutesDelay = Math.pow(3, job.attempts); // 3m -> 9m -> 27m
          const nextRun = new Date();
          nextRun.setMinutes(nextRun.getMinutes() + minutesDelay);

          const isMaxedOut = job.attempts + 1 >= job.max_attempts;

          await supabaseAdmin
            .from("job_queue")
            .update({
              status: isMaxedOut ? "failed" : "pending",
              run_at: nextRun.toISOString(),
              error_log: `Execution failed. Attempt ${job.attempts + 1} of ${job.max_attempts}.`,
              updated_at: new Date().toISOString()
            })
            .eq("id", job.id);
        }
      } catch (e: any) {
        console.error(`JobRunner Exception executing Job ID ${job.id}:`, e);
        await supabaseAdmin
          .from("job_queue")
          .update({
            status: "failed",
            error_log: e.message || "Fatal execution exception",
            updated_at: new Date().toISOString()
          })
          .eq("id", job.id);
      }
    }

    return NextResponse.json({ success: true, processed: jobs.length });

  } catch (err: any) {
    console.error("JobRunner Fatal error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function executeGoogleCalendarJob(job: any, _supabaseAdmin: any): Promise<boolean> {
  console.log(`JobRunner: Running Google Calendar Sync for Booking...`, job.payload);
  // Staging fallback success. Active Calendar oauth tokens will be wired in Phase 5.
  return true;
}

async function executeN8nWebhookJob(job: any, supabaseAdmin: any): Promise<boolean> {
  const { tenant_id, payload } = job;
  
  // Load n8n webhook URL
  const { data: settings, error } = await supabaseAdmin
    .from("tenant_settings")
    .select("n8n_booking_webhook_url")
    .eq("tenant_id", tenant_id)
    .single();

  if (error || !settings?.n8n_booking_webhook_url) {
    console.log(`JobRunner: n8n webhook URL not configured for tenant: ${tenant_id}. Skipping.`);
    return true; // mark completed since there is nothing to dispatch
  }

  const url = settings.n8n_booking_webhook_url;
  console.log(`JobRunner: Dispatching n8n webhook payload to ${url}...`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log("JobRunner: n8n webhook dispatch successful.");
      return true;
    } else {
      console.error(`JobRunner: n8n returned error status ${res.status}`);
      return false;
    }
  } catch (e) {
    console.error("JobRunner: n8n fetch exception:", e);
    return false;
  }
}

async function executeWhatsAppInboundJob(job: any): Promise<boolean> {
  console.log(`JobRunner: Executing WhatsApp Inbound Ingestion for job ID ${job.id}...`);
  try {
    const payload = job.payload;
    await leadIngestionService.processInboundMessage({
      tenant_id: payload.tenant_id,
      phone: payload.mobile,
      name: payload.name,
      message: payload.message,
      flow_node: payload.flow_node || "6206",
      meta_message_id: payload.meta_message_id,
      timestamp: payload.timestamp || new Date().toISOString(),
      rawPayload: payload.rawPayload || payload
    });
    return true;
  } catch (err) {
    console.error("JobRunner: WhatsApp Inbound job error:", err);
    return false;
  }
}
