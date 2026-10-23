// Supabase Edge Function: send-inquiry-notification
// Triggered by Database Webhook on INSERT into public.sample_inquiries
// Sends an immediate email notification to the sales inbox via Resend.

import { handleInquiryNotification } from "./handler.ts";
import type { NotificationConfig } from "./types.ts";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

Deno.serve(async (req: Request): Promise<Response> => {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const toEmail = Deno.env.get("INQUIRY_NOTIFICATION_TO");
  const fromEmail =
    Deno.env.get("INQUIRY_NOTIFICATION_FROM") || "ODE Inquiries <onboarding@resend.dev>";
  const webhookSecret = Deno.env.get("INQUIRY_WEBHOOK_SECRET");
  const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://outsole.ode.com";

  if (!resendApiKey) {
    console.error("[send-inquiry-notification] Configuration error: RESEND_API_KEY is not set.");
    return new Response(
      JSON.stringify({ error: "Server configuration error: RESEND_API_KEY is not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!toEmail) {
    console.error(
      "[send-inquiry-notification] Configuration error: INQUIRY_NOTIFICATION_TO is not set.",
    );
    return new Response(
      JSON.stringify({ error: "Server configuration error: INQUIRY_NOTIFICATION_TO is not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Collect all valid authentication secrets:
  // - Dedicated webhook secret (INQUIRY_WEBHOOK_SECRET) if configured
  // - Project secret keys automatically provided in Supabase Edge Functions runtime:
  //   SUPABASE_SECRET_KEY (sb_secret_...) and SUPABASE_SERVICE_ROLE_KEY.
  // When the Dashboard Database Webhook "Add secret key" option is used,
  // the request is sent with the project secret key in the apikey or Authorization header.
  const allowedSecrets = [
    webhookSecret,
    Deno.env.get("SUPABASE_SECRET_KEY"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  ].filter((s): s is string => typeof s === "string" && s.trim().length > 0);

  const config: NotificationConfig = {
    resendApiKey,
    toEmail,
    fromEmail,
    webhookSecret,
    allowedSecrets,
    appBaseUrl,
  };

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY");

  return handleInquiryNotification(req, config, {
    supabaseUrl,
    supabaseServiceKey,
  });
});
