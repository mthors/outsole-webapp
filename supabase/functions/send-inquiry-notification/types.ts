export type SampleInquiryRecord = {
  id: string;
  client_name: string;
  company_name: string;
  email: string;
  phone: string | null;
  message: string;
  outsole_id: string | null;
  status: string;
  created_at: string;
};

export type DatabaseWebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: SampleInquiryRecord;
  old_record: SampleInquiryRecord | null;
};

export type OutsoleDetails = {
  id: string;
  name: string;
  model_number: string;
  slug?: string;
};

export type NotificationConfig = {
  resendApiKey: string;
  toEmail: string;
  fromEmail: string;
  webhookSecret?: string;
  allowedSecrets?: string[];
  appBaseUrl?: string;
};

export type EmailPayload = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
};
