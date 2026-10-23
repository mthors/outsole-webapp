import type {
  SampleInquiryRecord,
  DatabaseWebhookPayload,
  OutsoleDetails,
  NotificationConfig,
  EmailPayload,
} from "./types.ts";
import { buildNotificationEmail } from "./email-template.ts";

/**
 * Validates authentication of incoming database webhook requests.
 *
 * Supports the official Supabase Database Webhook patterns:
 * 1. `apikey` header (standard Supabase header containing the project secret key
 *    when configured via Dashboard's "Add secret key" option)
 * 2. `Authorization: Bearer <secret>` header (standard Bearer authentication)
 * 3. `x-webhook-secret` header (optional custom header)
 *
 * Authenticates against:
 * - Supabase project secret / service-role keys (used by Dashboard's "Add secret key")
 * - Dedicated custom webhook secrets (e.g. INQUIRY_WEBHOOK_SECRET)
 */
export function verifyWebhookAuth(
  headers: Headers | Record<string, string | null | undefined>,
  allowedSecrets?: string | string[],
): { authorized: boolean; reason?: string } {
  const secrets = (Array.isArray(allowedSecrets) ? allowedSecrets : [allowedSecrets]).filter(
    (s): s is string => typeof s === "string" && s.trim().length > 0,
  );

  if (secrets.length === 0) {
    return {
      authorized: false,
      reason: "No webhook secret or service key configured in the function environment",
    };
  }

  const getHeader = (name: string): string | null => {
    if (typeof (headers as Headers).get === "function") {
      return (headers as Headers).get(name);
    }
    const record = headers as Record<string, string | null | undefined>;
    return record[name] ?? record[name.toLowerCase()] ?? null;
  };

  const apiKeyHeader = getHeader("apikey");
  const authHeader = getHeader("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const customSecret = getHeader("x-webhook-secret");

  const providedSecret = apiKeyHeader?.trim() || bearerToken || customSecret?.trim();

  if (!providedSecret) {
    return {
      authorized: false,
      reason:
        "Missing webhook authorization header (expected 'apikey', 'Authorization: Bearer <secret>', or 'x-webhook-secret')",
    };
  }

  const isAuthorized = secrets.some((secret) => secret.trim() === providedSecret);

  if (!isAuthorized) {
    return { authorized: false, reason: "Invalid webhook secret" };
  }

  return { authorized: true };
}

/**
 * Validates that the payload is a valid INSERT database webhook for `sample_inquiries`.
 */
export function validateWebhookPayload(body: unknown): {
  valid: boolean;
  shouldIgnore?: boolean;
  inquiry?: SampleInquiryRecord;
  reason?: string;
} {
  if (!body || typeof body !== "object") {
    return { valid: false, reason: "Invalid JSON body" };
  }

  const payload = body as Partial<DatabaseWebhookPayload>;

  // Check event type
  if (payload.type !== "INSERT") {
    return {
      valid: false,
      shouldIgnore: true,
      reason: `Ignored event type: ${payload.type ?? "unknown"}. Only INSERT events trigger notifications.`,
    };
  }

  // Check table name
  if (payload.table !== "sample_inquiries") {
    return {
      valid: false,
      shouldIgnore: true,
      reason: `Ignored table: ${payload.table ?? "unknown"}. Only sample_inquiries is handled.`,
    };
  }

  const record = payload.record as Partial<SampleInquiryRecord> | undefined;
  if (!record || typeof record !== "object") {
    return { valid: false, reason: "Missing payload record" };
  }

  // Verify mandatory inquiry fields
  if (!record.id || typeof record.id !== "string") {
    return { valid: false, reason: "Record is missing valid 'id'" };
  }
  if (!record.client_name || typeof record.client_name !== "string") {
    return { valid: false, reason: "Record is missing valid 'client_name'" };
  }
  if (!record.company_name || typeof record.company_name !== "string") {
    return { valid: false, reason: "Record is missing valid 'company_name'" };
  }
  if (!record.email || typeof record.email !== "string") {
    return { valid: false, reason: "Record is missing valid 'email'" };
  }
  if (!record.message || typeof record.message !== "string") {
    return { valid: false, reason: "Record is missing valid 'message'" };
  }

  const validatedInquiry: SampleInquiryRecord = {
    id: record.id,
    client_name: record.client_name,
    company_name: record.company_name,
    email: record.email,
    phone: typeof record.phone === "string" ? record.phone : null,
    message: record.message,
    outsole_id: typeof record.outsole_id === "string" ? record.outsole_id : null,
    status: typeof record.status === "string" ? record.status : "pending",
    created_at:
      typeof record.created_at === "string" ? record.created_at : new Date().toISOString(),
  };

  return { valid: true, inquiry: validatedInquiry };
}

/**
 * Look up outsole product details from Supabase REST API if `outsole_id` is linked.
 * Non-blocking: failures return null gracefully.
 */
export async function fetchOutsoleDetails(
  outsoleId: string,
  supabaseUrl?: string,
  serviceRoleKey?: string,
  fetchFn: typeof fetch = fetch,
): Promise<OutsoleDetails | null> {
  if (!supabaseUrl || !serviceRoleKey || !outsoleId) {
    return null;
  }

  try {
    const url = `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/outsoles?id=eq.${encodeURIComponent(outsoleId)}&select=id,name,model_number,slug`;
    const res = await fetchFn(url, {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) return null;
    const data = (await res.json()) as OutsoleDetails[];
    return Array.isArray(data) && data.length > 0 ? data[0]! : null;
  } catch {
    // Non-fatal: if lookup fails, continue with inquiry notification
    return null;
  }
}

/**
 * Dispatches the email to Resend with an idempotency key to prevent duplicate sends on retries.
 */
export async function sendEmailViaResend(
  emailPayload: EmailPayload,
  apiKey: string,
  idempotencyKey?: string,
  fetchFn: typeof fetch = fetch,
): Promise<{ id: string }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const res = await fetchFn("https://api.resend.com/emails", {
    method: "POST",
    headers,
    body: JSON.stringify(emailPayload),
  });

  if (!res.ok) {
    let errorDetails = "Unknown Resend error";
    try {
      const errJson = (await res.json()) as { message?: string; name?: string };
      errorDetails = errJson.message || errJson.name || JSON.stringify(errJson);
    } catch {
      errorDetails = await res.text();
    }
    throw new Error(`Resend API error (${res.status}): ${errorDetails}`);
  }

  const data = (await res.json()) as { id: string };
  return data;
}

/**
 * Main handler coordinating webhook auth, validation, template building, and Resend delivery.
 */
export async function handleInquiryNotification(
  req: Request,
  config: NotificationConfig,
  deps: {
    supabaseUrl?: string;
    supabaseServiceKey?: string;
    fetchFn?: typeof fetch;
  } = {},
): Promise<Response> {
  const fetchFn = deps.fetchFn || fetch;

  // 1. Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 455,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Validate webhook authentication
  const candidateSecrets = [
    ...(config.allowedSecrets || []),
    ...(config.webhookSecret ? [config.webhookSecret] : []),
  ];
  const auth = verifyWebhookAuth(req.headers, candidateSecrets);
  if (!auth.authorized) {
    return new Response(JSON.stringify({ error: auth.reason }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Parse JSON body
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Malformed JSON payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 4. Validate webhook event and schema
  const validation = validateWebhookPayload(rawBody);
  if (validation.shouldIgnore) {
    return new Response(JSON.stringify({ ignored: true, reason: validation.reason }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!validation.valid || !validation.inquiry) {
    return new Response(JSON.stringify({ error: validation.reason }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const inquiry = validation.inquiry;

  // 5. Look up outsole product details if attached
  let outsole: OutsoleDetails | null = null;
  if (inquiry.outsole_id) {
    outsole = await fetchOutsoleDetails(
      inquiry.outsole_id,
      deps.supabaseUrl,
      deps.supabaseServiceKey,
      fetchFn,
    );
  }

  // 6. Build email payload
  const emailPayload = buildNotificationEmail(inquiry, outsole, config);

  // 7. Send email via Resend with idempotency key
  // Resend deduplicates requests with the same Idempotency-Key within a 24-hour window
  const idempotencyKey = `ode-inquiry-${inquiry.id}`;

  try {
    const resendResult = await sendEmailViaResend(
      emailPayload,
      config.resendApiKey,
      idempotencyKey,
      fetchFn,
    );

    return new Response(
      JSON.stringify({
        success: true,
        emailId: resendResult.id,
        inquiryId: inquiry.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to dispatch email";
    // Log error for Supabase Edge Functions dashboard without logging credentials
    console.error(`[Inquiry Notification Error] ${errorMsg}`);

    return new Response(
      JSON.stringify({
        error: "Email delivery failed",
        details: errorMsg,
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
