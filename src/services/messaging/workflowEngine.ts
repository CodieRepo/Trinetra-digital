/**
 * Workflow Engine
 * Manages calendar syncs, n8n webhook dispatches, and retries.
 * Never responds directly to the customer.
 */

function parseDateToSql(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  const match = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }
  return new Date().toISOString().split('T')[0];
}

function parseTimeToSql(timeStr: string): string {
  const norm = timeStr.toLowerCase().trim();
  const match = norm.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const ampm = match[3];
    
    if (ampm === "pm" && hours < 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;
    
    return `${String(hours).padStart(2, '0')}:${minutes}:00`;
  }
  return "12:00:00";
}

export async function queueBookingWorkflow(
  tenantId: string,
  contactId: string,
  booking: { name: string; phone: string; service: string; date: string; time: string },
  supabaseAdmin: any
): Promise<boolean> {
  console.log(`WorkflowEngine: Queuing booking workflows for Contact ID: ${contactId}...`);

  const sqlDate = parseDateToSql(booking.date);
  const sqlTime = parseTimeToSql(booking.time);

  // 1. Insert booking details into database
  const { data: dbBooking, error: bookingErr } = await supabaseAdmin
    .from("bookings")
    .insert({
      tenant_id: tenantId,
      contact_id: contactId,
      preferred_date: sqlDate,
      preferred_time: sqlTime,
      call_type: "call",
      status: "confirmed",
      notes: `Service requested: ${booking.service}. Booked via automated WhatsApp flow.`
    })
    .select("id")
    .single();

  if (bookingErr || !dbBooking) {
    console.error("WorkflowEngine Error: Failed to insert booking entry:", bookingErr);
    return false;
  }

  // 2. Insert Google Calendar Job into queue
  const { error: calendarError } = await supabaseAdmin.from("job_queue").insert({
    tenant_id: tenantId,
    job_type: "google_calendar_event",
    payload: {
      bookingId: dbBooking.id,
      contactId,
      booking
    },
    status: "pending",
    run_at: new Date().toISOString()
  });

  // 3. Insert n8n dispatch Job into queue
  const { error: n8nError } = await supabaseAdmin.from("job_queue").insert({
    tenant_id: tenantId,
    job_type: "n8n_webhook_dispatch",
    payload: {
      bookingId: dbBooking.id,
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
