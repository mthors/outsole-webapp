import type {
  SampleInquiryRecord,
  OutsoleDetails,
  NotificationConfig,
  EmailPayload,
} from "./types.ts";

/**
 * Escapes HTML characters in untrusted user-submitted text to prevent
 * HTML injection / XSS in email clients.
 */
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Converts newlines to <br/> while safely escaping HTML characters.
 */
export function formatMultilineText(str: unknown): string {
  return escapeHtml(str).replace(/\r?\n/g, "<br/>");
}

/**
 * Formats an ISO date string into a clean, human-readable UTC timestamp.
 */
export function formatTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const min = String(d.getUTCMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${min} UTC`;
  } catch {
    return isoString;
  }
}

/**
 * Builds the notification email subject line: `New ODE Inquiry — [Customer or Organization]`.
 */
export function buildNotificationSubject(inquiry: SampleInquiryRecord): string {
  const company = inquiry.company_name?.trim();
  const client = inquiry.client_name?.trim();
  const identifier = company || client || "New Lead";
  return `New Inquiry Available — ${identifier}`;
}

/**
 * Builds the complete HTML and plain text email payload for Resend.
 */
export function buildNotificationEmail(
  inquiry: SampleInquiryRecord,
  outsole: OutsoleDetails | null,
  config: NotificationConfig,
): EmailPayload {
  const subject = buildNotificationSubject(inquiry);
  const formattedTime = formatTimestamp(inquiry.created_at);
  const productLabel = outsole
    ? `${outsole.name} (${outsole.model_number})`
    : "General Inquiry (No specific model)";

  const baseUrl = config.appBaseUrl?.replace(/\/+$/, "") || "localhost:8080";
  const adminInquiryUrl = `${baseUrl}/admin/inquiries?inquiry=${encodeURIComponent(inquiry.id)}`;

  const safeClient = escapeHtml(inquiry.client_name);
  const safeCompany = escapeHtml(inquiry.company_name);
  const safeEmail = escapeHtml(inquiry.email);
  const safePhone = inquiry.phone ? escapeHtml(inquiry.phone) : "Not provided";
  const safeProduct = escapeHtml(productLabel);
  const safeMessageHtml = formatMultilineText(inquiry.message);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #292925;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f5f7; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 4px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #083b7b; padding: 24px 32px; text-align: left;">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #93c5fd; display: block; margin-bottom: 4px;">ODE Outsole Catalog</span>
              <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #ffffff; line-height: 1.3;">New Sample Inquiry Received</h1>
            </td>
          </tr>

          <!-- Summary banner -->
          <tr>
            <td style="padding: 24px 32px 12px 32px; background-color: #ffffff;">
              <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #4b5563;">
                A new B2B customer inquiry has been submitted through the ODE digital catalog.
              </p>
            </td>
          </tr>

          <!-- Details Table -->
          <tr>
            <td style="padding: 12px 32px 24px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: 600; width: 140px; vertical-align: top;">Submission Time</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; vertical-align: top;">${formattedTime}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: 600; vertical-align: top;">Customer Name</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 600; vertical-align: top;">${safeClient}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: 600; vertical-align: top;">Organization</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; vertical-align: top;">${safeCompany}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: 600; vertical-align: top;">Email Address</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #083b7b; vertical-align: top;"><a href="mailto:${safeEmail}" style="color: #083b7b; text-decoration: underline;">${safeEmail}</a></td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: 600; vertical-align: top;">Phone Number</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; vertical-align: top;">${safePhone}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: 600; vertical-align: top;">Requested Product</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; vertical-align: top;">${safeProduct}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message Section -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-left: 3px solid #083b7b; border-radius: 2px; padding: 16px;">
                <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; display: block; margin-bottom: 8px;">Customer Message</span>
                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #1f2937; word-break: break-word;">${safeMessageHtml}</p>
              </div>
            </td>
          </tr>

          <!-- Action CTA -->
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: left;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="border-radius: 2px; background-color: #083b7b;">
                    <a href="${adminInquiryUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 13px; font-weight: 600; color: #ffffff; text-decoration: none; display: inline-block; padding: 12px 24px; border: 1px solid #083b7b; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.08em;">View in ODE Admin</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px 32px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #9ca3af; line-height: 1.4;">
                This notification was automatically sent by the ODE Outsole system to ${escapeHtml(config.toEmail)}.<br/>
                Inquiry ID: <span style="font-family: monospace;">${escapeHtml(inquiry.id)}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `NEW ODE INQUIRY
========================================

A new B2B sample inquiry has been submitted.

Submission Time:    ${formattedTime}
Customer Name:      ${inquiry.client_name}
Organization:       ${inquiry.company_name}
Email Address:      ${inquiry.email}
Phone Number:       ${inquiry.phone || "Not provided"}
Requested Product:  ${productLabel}
Inquiry ID:         ${inquiry.id}

CUSTOMER MESSAGE:
----------------------------------------
${inquiry.message}
----------------------------------------

Manage this inquiry in the ODE Admin Portal:
${adminInquiryUrl}

---
ODE Outsole Catalog System • Notification sent to ${config.toEmail}
`;

  return {
    from: config.fromEmail,
    to: [config.toEmail],
    subject,
    html,
    text,
  };
}
