import { describe, it, expect, mock } from "bun:test";
import {
  escapeHtml,
  formatMultilineText,
  formatTimestamp,
  buildNotificationSubject,
  buildNotificationEmail,
} from "./email-template.ts";
import {
  verifyWebhookAuth,
  validateWebhookPayload,
  fetchOutsoleDetails,
  sendEmailViaResend,
  handleInquiryNotification,
} from "./handler.ts";
import type { SampleInquiryRecord, OutsoleDetails, NotificationConfig } from "./types.ts";

describe("Inquiry Notification - HTML Escaping & Content Sanitization", () => {
  it("escapes all HTML special characters to prevent HTML injection and XSS", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;",
    );
    expect(escapeHtml("Acme & Co <test> \"quoted\" 'single'")).toBe(
      "Acme &amp; Co &lt;test&gt; &quot;quoted&quot; &#39;single&#39;",
    );
  });

  it("handles null and undefined values safely", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("converts newlines to <br/> while escaping HTML entities in multiline text", () => {
    const raw = "Line 1\n<script>bad()</script>\r\nLine 3";
    const formatted = formatMultilineText(raw);
    expect(formatted).toBe("Line 1<br/>&lt;script&gt;bad()&lt;/script&gt;<br/>Line 3");
  });

  it("formats ISO timestamps into readable UTC strings", () => {
    const ts = "2026-10-23T14:30:00Z";
    expect(formatTimestamp(ts)).toBe("2026-10-23 14:30 UTC");
  });
});

describe("Inquiry Notification - Email Subject and Content Generation", () => {
  const sampleInquiry: SampleInquiryRecord = {
    id: "inq-1234-uuid",
    client_name: "John Miller",
    company_name: "Summit Outdoors",
    email: "john@summitoutdoors.com",
    phone: "+1 555 0199",
    message: "We need 1,000 pairs of high-abrasion hiking soles with custom compound.",
    outsole_id: "out-5678-uuid",
    status: "pending",
    created_at: "2026-10-23T12:00:00Z",
  };

  const sampleOutsole: OutsoleDetails = {
    id: "out-5678-uuid",
    name: "Trail Master Pro",
    model_number: "TMP-900",
    slug: "trail-master-pro",
  };

  const sampleConfig: NotificationConfig = {
    resendApiKey: "re_mock_test_key",
    toEmail: "sales@odeoutsole.com",
    fromEmail: "ODE Inquiries <notifications@odeoutsole.com>",
    webhookSecret: "super-secret-webhook-key",
    appBaseUrl: "https://outsole.ode.com",
  };

  it("generates correct email subject using company name", () => {
    expect(buildNotificationSubject(sampleInquiry)).toBe("New ODE Inquiry — Summit Outdoors");
  });

  it("falls back to customer name if company name is empty", () => {
    const withoutCompany = { ...sampleInquiry, company_name: "" };
    expect(buildNotificationSubject(withoutCompany)).toBe("New ODE Inquiry — John Miller");
  });

  it("builds complete HTML and text payloads with accurate product details and admin link", () => {
    const email = buildNotificationEmail(sampleInquiry, sampleOutsole, sampleConfig);

    expect(email.from).toBe(sampleConfig.fromEmail);
    expect(email.to).toEqual([sampleConfig.toEmail]);
    expect(email.subject).toBe("New ODE Inquiry — Summit Outdoors");

    // Check HTML contents
    expect(email.html).toContain("John Miller");
    expect(email.html).toContain("Summit Outdoors");
    expect(email.html).toContain("john@summitoutdoors.com");
    expect(email.html).toContain("+1 555 0199");
    expect(email.html).toContain("Trail Master Pro (TMP-900)");
    expect(email.html).toContain("We need 1,000 pairs of high-abrasion hiking soles");
    expect(email.html).toContain("https://outsole.ode.com/admin/inquiries?inquiry=inq-1234-uuid");

    // Check Text contents
    expect(email.text).toContain("Customer Name:      John Miller");
    expect(email.text).toContain("Organization:       Summit Outdoors");
    expect(email.text).toContain("Trail Master Pro (TMP-900)");
    expect(email.text).toContain("https://outsole.ode.com/admin/inquiries?inquiry=inq-1234-uuid");
  });

  it("handles general inquiry when no outsole is attached", () => {
    const email = buildNotificationEmail(sampleInquiry, null, sampleConfig);
    expect(email.html).toContain("General Inquiry (No specific model)");
    expect(email.text).toContain("General Inquiry (No specific model)");
  });
});

describe("Inquiry Notification - Webhook Authentication & Authorization", () => {
  const secret = "secret-token-123";
  const projectSecretKey = "sb_secret_sample_project_key";

  it("accepts request with matching apikey header (Supabase Dashboard secret key pattern)", () => {
    const headers = new Headers({ apikey: projectSecretKey });
    const result = verifyWebhookAuth(headers, projectSecretKey);
    expect(result.authorized).toBe(true);
  });

  it("accepts request with matching x-webhook-secret header", () => {
    const headers = new Headers({ "x-webhook-secret": "secret-token-123" });
    const result = verifyWebhookAuth(headers, secret);
    expect(result.authorized).toBe(true);
  });

  it("accepts request with matching Bearer token in Authorization header", () => {
    const headers = new Headers({ authorization: "Bearer secret-token-123" });
    const result = verifyWebhookAuth(headers, secret);
    expect(result.authorized).toBe(true);
  });

  it("accepts request matching any of multiple allowed secrets", () => {
    const allowed = [secret, projectSecretKey];
    const headers = new Headers({ apikey: projectSecretKey });
    const result = verifyWebhookAuth(headers, allowed);
    expect(result.authorized).toBe(true);
  });

  it("rejects request with invalid secret", () => {
    const headers = new Headers({ apikey: "wrong-secret" });
    const result = verifyWebhookAuth(headers, secret);
    expect(result.authorized).toBe(false);
    expect(result.reason).toContain("Invalid webhook secret");
  });

  it("rejects request with missing authorization headers", () => {
    const headers = new Headers();
    const result = verifyWebhookAuth(headers, secret);
    expect(result.authorized).toBe(false);
    expect(result.reason).toContain("Missing webhook authorization header");
  });

  it("rejects request if server has no secret configured", () => {
    const headers = new Headers({ apikey: projectSecretKey });
    const result = verifyWebhookAuth(headers, undefined);
    expect(result.authorized).toBe(false);
    expect(result.reason).toContain("No webhook secret or service key configured");
  });
});

describe("Inquiry Notification - Payload Validation", () => {
  it("accepts a well-formed INSERT webhook payload for sample_inquiries", () => {
    const payload = {
      type: "INSERT",
      table: "sample_inquiries",
      schema: "public",
      record: {
        id: "uuid-1",
        client_name: "Alice",
        company_name: "Brand X",
        email: "alice@brandx.com",
        phone: "12345",
        message: "Hello world inquiry",
        outsole_id: null,
        status: "pending",
        created_at: "2026-10-23T10:00:00Z",
      },
    };

    const res = validateWebhookPayload(payload);
    expect(res.valid).toBe(true);
    expect(res.inquiry?.id).toBe("uuid-1");
    expect(res.inquiry?.client_name).toBe("Alice");
  });

  it("gracefully ignores non-INSERT events (e.g. UPDATE, DELETE)", () => {
    const updatePayload = {
      type: "UPDATE",
      table: "sample_inquiries",
      schema: "public",
      record: { id: "uuid-1" },
    };

    const res = validateWebhookPayload(updatePayload);
    expect(res.valid).toBe(false);
    expect(res.shouldIgnore).toBe(true);
    expect(res.reason).toContain("Ignored event type: UPDATE");
  });

  it("gracefully ignores events for tables other than sample_inquiries", () => {
    const otherTablePayload = {
      type: "INSERT",
      table: "outsoles",
      schema: "public",
      record: { id: "uuid-2" },
    };

    const res = validateWebhookPayload(otherTablePayload);
    expect(res.valid).toBe(false);
    expect(res.shouldIgnore).toBe(true);
    expect(res.reason).toContain("Ignored table: outsoles");
  });

  it("rejects payloads missing mandatory fields", () => {
    const missingEmail = {
      type: "INSERT",
      table: "sample_inquiries",
      record: {
        id: "uuid-3",
        client_name: "Bob",
        company_name: "Corp",
        // email is missing
        message: "Some message",
      },
    };

    const res = validateWebhookPayload(missingEmail);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain("missing valid 'email'");
  });
});

describe("Inquiry Notification - Outsole Product Details Fetcher", () => {
  it("fetches product details when outsole_id is provided and API responds with 200", async () => {
    const mockFetch = mock(async () => {
      return new Response(
        JSON.stringify([
          {
            id: "outsole-100",
            name: "Eco Traction Low",
            model_number: "ETL-20",
            slug: "eco-traction-low",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const details = await fetchOutsoleDetails(
      "outsole-100",
      "https://test.supabase.co",
      "mock-service-key",
      mockFetch as unknown as typeof fetch,
    );

    expect(details).toBeDefined();
    expect(details?.name).toBe("Eco Traction Low");
    expect(details?.model_number).toBe("ETL-20");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns null gracefully if PostgREST request fails", async () => {
    const mockFetch = mock(async () => {
      return new Response("Not found", { status: 404 });
    });

    const details = await fetchOutsoleDetails(
      "outsole-unknown",
      "https://test.supabase.co",
      "mock-service-key",
      mockFetch as unknown as typeof fetch,
    );

    expect(details).toBeNull();
  });
});

describe("Inquiry Notification - Resend API Dispatch & Idempotency", () => {
  it("sends payload to Resend API with Idempotency-Key and Bearer Authorization", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: Record<string, unknown> | null = null;

    const mockFetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = url.toString();
      capturedHeaders = init?.headers as Record<string, string>;
      capturedBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({ id: "resend-msg-12345" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const emailPayload = {
      from: "notifications@ode.com",
      to: ["sales@ode.com"],
      subject: "Test Subject",
      html: "<p>Hello</p>",
      text: "Hello",
    };

    const res = await sendEmailViaResend(
      emailPayload,
      "re_test_key_abc",
      "ode-inquiry-inq-123",
      mockFetch as unknown as typeof fetch,
    );

    expect(res.id).toBe("resend-msg-12345");
    expect(capturedUrl).toBe("https://api.resend.com/emails");
    expect(capturedHeaders["Authorization"]).toBe("Bearer re_test_key_abc");
    expect(capturedHeaders["Idempotency-Key"]).toBe("ode-inquiry-inq-123");
    expect(capturedBody?.to).toEqual(["sales@ode.com"]);
    expect(capturedBody?.subject).toBe("Test Subject");
  });

  it("throws descriptive error when Resend API returns non-200 status", async () => {
    const mockFetch = mock(async () => {
      return new Response(
        JSON.stringify({ message: "Invalid API key", name: "validation_error" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    });

    const emailPayload = {
      from: "notifications@ode.com",
      to: ["sales@ode.com"],
      subject: "Test Subject",
      html: "<p>Hello</p>",
      text: "Hello",
    };

    expect(
      sendEmailViaResend(
        emailPayload,
        "re_invalid",
        "idemp-key",
        mockFetch as unknown as typeof fetch,
      ),
    ).rejects.toThrow("Resend API error (401): Invalid API key");
  });
});

describe("Inquiry Notification - End-to-End Edge Function Handler", () => {
  const config: NotificationConfig = {
    resendApiKey: "re_valid_api_key",
    toEmail: "sales@gmail.com",
    fromEmail: "notifications@odeoutsole.com",
    webhookSecret: "whsec_supersecret123",
    appBaseUrl: "https://outsole.ode.com",
  };

  const validPayload = {
    type: "INSERT",
    table: "sample_inquiries",
    schema: "public",
    record: {
      id: "inquiry-abc-789",
      client_name: "Sarah Connor",
      company_name: "Cyberdyne Systems",
      email: "sarah@cyberdyne.com",
      phone: "+62 812 3456",
      message: "Need 200 prototype soles with oil resistance.",
      outsole_id: null,
      status: "pending",
      created_at: "2026-10-23T15:00:00Z",
    },
  };

  it("processes valid webhook and sends email successfully (200 OK)", async () => {
    const mockFetch = mock(async (url: string | URL | Request) => {
      if (url.toString().includes("api.resend.com")) {
        return new Response(JSON.stringify({ id: "email-id-999" }), { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    });

    const request = new Request("https://mock.supabase.co/functions/v1/send-inquiry-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": "whsec_supersecret123",
      },
      body: JSON.stringify(validPayload),
    });

    const response = await handleInquiryNotification(request, config, {
      fetchFn: mockFetch as unknown as typeof fetch,
    });
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      success: boolean;
      emailId: string;
      inquiryId: string;
    };
    expect(body.success).toBe(true);
    expect(body.emailId).toBe("email-id-999");
    expect(body.inquiryId).toBe("inquiry-abc-789");
  });

  it("authenticates via apikey header matching project secret key (Dashboard 'Add secret key' pattern)", async () => {
    const mockFetch = mock(async (url: string | URL | Request) => {
      if (url.toString().includes("api.resend.com")) {
        return new Response(JSON.stringify({ id: "email-id-dashboard-test" }), { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    });

    const dashboardConfig: NotificationConfig = {
      resendApiKey: "re_test_key_123",
      toEmail: "sales@ode.com",
      fromEmail: "ODE Inquiries <onboarding@resend.dev>",
      allowedSecrets: ["sb_secret_project_master_key"],
    };

    const request = new Request("https://mock.supabase.co/functions/v1/send-inquiry-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: "sb_secret_project_master_key",
      },
      body: JSON.stringify(validPayload),
    });

    const response = await handleInquiryNotification(request, dashboardConfig, {
      fetchFn: mockFetch as unknown as typeof fetch,
    });
    expect(response.status).toBe(200);

    const body = (await response.json()) as { success: boolean; emailId: string };
    expect(body.success).toBe(true);
    expect(body.emailId).toBe("email-id-dashboard-test");
  });

  it("rejects unauthorized webhook request with 401 Unauthorized", async () => {
    const request = new Request("https://mock.supabase.co/functions/v1/send-inquiry-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": "wrong-secret",
      },
      body: JSON.stringify(validPayload),
    });

    const response = await handleInquiryNotification(request, config);
    expect(response.status).toBe(401);

    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("Invalid webhook secret");
  });

  it("returns 200 Ignored when receiving non-INSERT events", async () => {
    const updatePayload = {
      type: "UPDATE",
      table: "sample_inquiries",
      record: { id: "inquiry-abc-789" },
    };

    const request = new Request("https://mock.supabase.co/functions/v1/send-inquiry-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": "whsec_supersecret123",
      },
      body: JSON.stringify(updatePayload),
    });

    const response = await handleInquiryNotification(request, config);
    expect(response.status).toBe(200);

    const body = (await response.json()) as { ignored: boolean; reason: string };
    expect(body.ignored).toBe(true);
    expect(body.reason).toContain("Only INSERT events trigger notifications");
  });

  it("returns 502 Bad Gateway with details when email delivery provider fails", async () => {
    const mockFetch = mock(async () => {
      return new Response(JSON.stringify({ message: "Daily quota exceeded" }), { status: 429 });
    });

    const request = new Request("https://mock.supabase.co/functions/v1/send-inquiry-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": "whsec_supersecret123",
      },
      body: JSON.stringify(validPayload),
    });

    const response = await handleInquiryNotification(request, config, {
      fetchFn: mockFetch as unknown as typeof fetch,
    });
    expect(response.status).toBe(502);

    const body = (await response.json()) as { error: string; details: string };
    expect(body.error).toBe("Email delivery failed");
    expect(body.details).toContain("Daily quota exceeded");
  });
});
