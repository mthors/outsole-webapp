import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ============================================================================
// Schemas & Types
// ============================================================================

export const inquiryStatusEnum = z.enum(["pending", "contacted", "resolved"]);
export type InquiryStatus = z.infer<typeof inquiryStatusEnum>;

export type AdminInquiryOutsole = {
  id: string;
  name: string;
  model_number: string;
  slug: string;
  status?: string;
} | null;

export type AdminInquiryListItem = {
  id: string;
  outsole_id: string | null;
  client_name: string;
  company_name: string;
  email: string;
  phone: string | null;
  message: string;
  status: InquiryStatus;
  created_at: string;
  outsole: AdminInquiryOutsole;
};

export const listInquiriesSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["all", "pending", "contacted", "resolved"]).default("all"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type ListInquiriesInput = z.infer<typeof listInquiriesSchema>;

export type AdminInquiriesListResponse = {
  inquiries: AdminInquiryListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  statusCounts: {
    all: number;
    pending: number;
    contacted: number;
    resolved: number;
  };
};

export const updateInquiryStatusSchema = z.object({
  id: z.string().uuid("Invalid inquiry ID"),
  status: inquiryStatusEnum,
});

export type UpdateInquiryStatusInput = z.infer<typeof updateInquiryStatusSchema>;

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Server function: Lists customer sample inquiries with search, status filtering, and pagination.
 * Restricted to authenticated staff.
 */
export const listAdminInquiries = createServerFn({ method: "GET" })
  .validator((data: unknown) => listInquiriesSchema.parse(data ?? {}))
  .handler(async ({ data }): Promise<AdminInquiriesListResponse> => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const page = data.page ?? 1;
    const pageSize = data.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // 1. Get status counts for tab badges
    const [allRes, pendingRes, contactedRes, resolvedRes] = await Promise.all([
      supabaseAdmin.from("sample_inquiries").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("sample_inquiries").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("sample_inquiries").select("id", { count: "exact", head: true }).eq("status", "contacted"),
      supabaseAdmin.from("sample_inquiries").select("id", { count: "exact", head: true }).eq("status", "resolved"),
    ]);

    const statusCounts = {
      all: allRes.count ?? 0,
      pending: pendingRes.count ?? 0,
      contacted: contactedRes.count ?? 0,
      resolved: resolvedRes.count ?? 0,
    };

    // 2. Build filtered query
    let query = supabaseAdmin
      .from("sample_inquiries")
      .select(
        `
        id,
        outsole_id,
        client_name,
        company_name,
        email,
        phone,
        message,
        status,
        created_at,
        outsoles (
          id,
          name,
          model_number,
          slug
        )
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    // Status filter
    if (data.status && data.status !== "all") {
      query = query.eq("status", data.status);
    }

    // Search filter
    const term = data.search?.trim().replace(/[%_]/g, "");
    if (term && term.length > 0) {
      // Find matching outsoles by name or SKU
      const { data: matchingOutsoles } = await supabaseAdmin
        .from("outsoles")
        .select("id")
        .or(`name.ilike.%${term}%,model_number.ilike.%${term}%`);

      const matchingIds = (matchingOutsoles ?? []).map((o) => o.id);

      const conditions = [
        `client_name.ilike.%${term}%`,
        `company_name.ilike.%${term}%`,
        `email.ilike.%${term}%`,
        `phone.ilike.%${term}%`,
      ];

      if (matchingIds.length > 0) {
        conditions.push(`outsole_id.in.(${matchingIds.join(",")})`);
      }

      query = query.or(conditions.join(","));
    }

    // Apply pagination range
    query = query.range(from, to);

    const { data: rows, count, error } = await query;

    if (error) {
      throw new Error(`Failed to load inquiries: ${error.message}`);
    }

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const inquiries: AdminInquiryListItem[] = (rows ?? []).map((r) => {
      const out = Array.isArray(r.outsoles) ? r.outsoles[0] : r.outsoles;
      return {
        id: r.id,
        outsole_id: r.outsole_id,
        client_name: r.client_name,
        company_name: r.company_name,
        email: r.email,
        phone: r.phone ?? null,
        message: r.message,
        status: (r.status as InquiryStatus) ?? "pending",
        created_at: r.created_at,
        outsole: out
          ? {
              id: out.id,
              name: out.name,
              model_number: out.model_number,
              slug: out.slug,
            }
          : null,
      };
    });

    return {
      inquiries,
      total,
      page,
      pageSize,
      totalPages,
      statusCounts,
    };
  });

/**
 * Server function: Fetches a single inquiry in detail.
 * Restricted to authenticated staff.
 */
export const getAdminInquiry = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ id: z.string().uuid("Invalid inquiry ID") }).parse(data),
  )
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("sample_inquiries")
      .select(
        `
        id,
        outsole_id,
        client_name,
        company_name,
        email,
        phone,
        message,
        status,
        created_at,
        outsoles (
          id,
          name,
          model_number,
          slug,
          status,
          description
        )
      `,
      )
      .eq("id", data.id)
      .single();

    if (error || !row) {
      throw new Error("Inquiry not found");
    }

    const out = Array.isArray(row.outsoles) ? row.outsoles[0] : row.outsoles;

    return {
      inquiry: {
        id: row.id,
        outsole_id: row.outsole_id,
        client_name: row.client_name,
        company_name: row.company_name,
        email: row.email,
        phone: row.phone ?? null,
        message: row.message,
        status: (row.status as InquiryStatus) ?? "pending",
        created_at: row.created_at,
        outsole: out
          ? {
              id: out.id,
              name: out.name,
              model_number: out.model_number,
              slug: out.slug,
              status: out.status,
              description: out.description,
            }
          : null,
      },
    };
  });

/**
 * Server function: Updates an inquiry's workflow status ('pending' | 'contacted' | 'resolved').
 * Restricted to authenticated staff.
 */
export const updateAdminInquiryStatus = createServerFn({ method: "POST" })
  .validator((data: unknown) => updateInquiryStatusSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: updated, error } = await supabaseAdmin
      .from("sample_inquiries")
      .update({ status: data.status })
      .eq("id", data.id)
      .select("id, status")
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update inquiry status: ${error?.message ?? "Inquiry not found"}`);
    }

    return { success: true, inquiry: updated };
  });
