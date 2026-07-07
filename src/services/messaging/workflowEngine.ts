/**
 * Workflow Engine
 * Manages calendar syncs, n8n webhook dispatches, and retries.
 * Never responds directly to the customer.
 */

export async function queueBookingWorkflow(
  tenantId: string,
  contactId: string,
  booking: { name: string; phone: string; service: string; date: string; time: string },
  supabaseAdmin: any
): Promise<boolean> {
  console.log(`WorkflowEngine: Queuing booking workflows for Contact ID: ${contactId}...`);

  // 1. Insert Google Calendar Job into queue
  const { error: calendarError } = await supabaseAdmin.from("job_queue").insert({
    tenant_id: tenantId,
    job_type: "google_calendar_event",
    payload: {
      contactId,
      booking
    },
    status: "pending",
    run_at: new Date().toISOString()
  });

  // 2. Insert n8n dispatch Job into queue
  const { error: n8nError } = await supabaseAdmin.from("job_queue").insert({
    tenant_id: tenantId,
    job_type: "n8n_webhook_dispatch",
    payload: {
      contactId,
      booking
    },
    status: "pending",
    run_at: new Date().toISOString()
  });

  if (calendarError || n8nError) {
    console.error("WorkflowEngine Error: Failed to queue background jobs.", { calendarError, n8nError });
    return false;
  }

  console.log("WorkflowEngine Success: Background jobs successfully queued.");
  
  // Proactively trigger async runner execution without blocking the main response
  triggerAsyncJobRunner(tenantId).catch(err => {
    console.error("WorkflowEngine runner invoke failed:", err);
  });

  return true;
}

/**
 * Triggers execution of pending jobs asynchronously by calling our internal API endpoint.
 * This ensures the execution runs in the background and is non-blocking to the webhook thread.
 */
async function triggerAsyncJobRunner(tenantId: string) {
  const host = process.env.NEXT_PUBLIC_APP_URL || "https://trinetra-digital.vercel.app";
  
  // Call internal run-jobs API in the background (non-blocking)
  fetch(`${host}/api/jobs/run?tenant_id=${tenantId}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  }).catch(() => {
    // Suppress network wait errors since it's a fire-and-forget call
  });
}
