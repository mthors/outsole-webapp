import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const inquirySchema = z.object({
  client_name: z.string().trim().min(2, "Please enter your name").max(100),
  company_name: z.string().trim().min(2, "Please enter your company").max(100),
  email: z.string().trim().email("Enter a valid email address").max(255),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  message: z.string().trim().min(10, "Please add a few details").max(2000),
  outsole_id: z.string().uuid().optional().or(z.literal("")),
});

export type InquiryInput = z.infer<typeof inquirySchema>;

export const submitInquiry = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inquirySchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Basic abuse guard: no more than 3 requests per email in 10 minutes.
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("sample_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("email", data.email.toLowerCase())
      .gte("created_at", since);

    if ((count ?? 0) >= 3) {
      throw new Error("We already have your recent requests. Our team will be in touch shortly.");
    }

    let outsoleId: string | null = null;
    if (data.outsole_id) {
      const { data: outsole } = await supabaseAdmin
        .from("outsoles")
        .select("id")
        .eq("id", data.outsole_id)
        .eq("status", "active")
        .maybeSingle();
      outsoleId = outsole?.id ?? null;
    }

    const { error } = await supabaseAdmin.from("sample_inquiries").insert({
      outsole_id: outsoleId,
      client_name: data.client_name,
      company_name: data.company_name,
      email: data.email.toLowerCase(),
      phone: data.phone ? data.phone : null,
      message: data.message,
    });

    if (error) throw new Error("We could not send your request. Please try again.");
    return { ok: true };
  });
