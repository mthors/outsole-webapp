import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// Types
// ============================================================================

export type DashboardProductMetrics = {
  total: number;
  active: number;
  draft: number;
  archived: number;
};

export type DashboardInquiryMetrics = {
  total: number;
  pending: number;
  contacted: number;
  resolved: number;
};

export type DashboardTaxonomyMetrics = {
  categories: number;
  materials: number;
  tractionTypes: number;
};

export type RecentInquiryItem = {
  id: string;
  client_name: string;
  company_name: string;
  status: "pending" | "contacted" | "resolved";
  created_at: string;
  outsole_id: string | null;
  product_name: string | null;
  product_model: string | null;
};

export type RecentProductItem = {
  id: string;
  name: string;
  model_number: string;
  status: "active" | "draft" | "archived";
  is_featured: boolean;
  updated_at: string;
};

export type AdminDashboardData = {
  products: DashboardProductMetrics;
  inquiries: DashboardInquiryMetrics;
  taxonomy: DashboardTaxonomyMetrics;
  recentInquiries: RecentInquiryItem[];
  recentProducts: RecentProductItem[];
};

// ============================================================================
// Data Fetcher
// ============================================================================

/**
 * Pure data-fetching logic for dashboard metrics and recent activity.
 * Can be called with any Supabase client (e.g. server-side admin or integration test client).
 */
export async function fetchDashboardMetrics(
  client: SupabaseClient,
): Promise<AdminDashboardData> {
  const [
    productsTotalRes,
    productsActiveRes,
    productsDraftRes,
    productsArchivedRes,
    inquiriesTotalRes,
    inquiriesPendingRes,
    inquiriesContactedRes,
    inquiriesResolvedRes,
    categoriesCountRes,
    materialsCountRes,
    tractionTypesCountRes,
    recentInquiriesRes,
    recentProductsRes,
  ] = await Promise.all([
    client.from("outsoles").select("id", { count: "exact", head: true }),
    client.from("outsoles").select("id", { count: "exact", head: true }).eq("status", "active"),
    client.from("outsoles").select("id", { count: "exact", head: true }).eq("status", "draft"),
    client.from("outsoles").select("id", { count: "exact", head: true }).eq("status", "archived"),
    client.from("sample_inquiries").select("id", { count: "exact", head: true }),
    client.from("sample_inquiries").select("id", { count: "exact", head: true }).eq("status", "pending"),
    client.from("sample_inquiries").select("id", { count: "exact", head: true }).eq("status", "contacted"),
    client.from("sample_inquiries").select("id", { count: "exact", head: true }).eq("status", "resolved"),
    client.from("categories").select("id", { count: "exact", head: true }),
    client.from("materials").select("id", { count: "exact", head: true }),
    client.from("traction_types").select("id", { count: "exact", head: true }),
    client
      .from("sample_inquiries")
      .select(`
        id,
        client_name,
        company_name,
        status,
        created_at,
        outsole_id,
        outsoles (
          id,
          name,
          model_number
        )
      `)
      .order("created_at", { ascending: false })
      .limit(5),
    client
      .from("outsoles")
      .select("id, name, model_number, status, is_featured, updated_at")
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  if (productsTotalRes.error) throw new Error(`Failed to count total outsoles: ${productsTotalRes.error.message}`);
  if (productsActiveRes.error) throw new Error(`Failed to count active outsoles: ${productsActiveRes.error.message}`);
  if (productsDraftRes.error) throw new Error(`Failed to count draft outsoles: ${productsDraftRes.error.message}`);
  if (productsArchivedRes.error) throw new Error(`Failed to count archived outsoles: ${productsArchivedRes.error.message}`);

  if (inquiriesTotalRes.error) throw new Error(`Failed to count total inquiries: ${inquiriesTotalRes.error.message}`);
  if (inquiriesPendingRes.error) throw new Error(`Failed to count pending inquiries: ${inquiriesPendingRes.error.message}`);
  if (inquiriesContactedRes.error) throw new Error(`Failed to count contacted inquiries: ${inquiriesContactedRes.error.message}`);
  if (inquiriesResolvedRes.error) throw new Error(`Failed to count resolved inquiries: ${inquiriesResolvedRes.error.message}`);

  if (categoriesCountRes.error) throw new Error(`Failed to count categories: ${categoriesCountRes.error.message}`);
  if (materialsCountRes.error) throw new Error(`Failed to count materials: ${materialsCountRes.error.message}`);
  if (tractionTypesCountRes.error) throw new Error(`Failed to count traction types: ${tractionTypesCountRes.error.message}`);

  if (recentInquiriesRes.error) throw new Error(`Failed to fetch recent inquiries: ${recentInquiriesRes.error.message}`);
  if (recentProductsRes.error) throw new Error(`Failed to fetch recent products: ${recentProductsRes.error.message}`);

  // Format recent inquiries
  const recentInquiries: RecentInquiryItem[] = (recentInquiriesRes.data ?? []).map((row: any) => {
    const o = Array.isArray(row.outsoles) ? row.outsoles[0] : row.outsoles;
    return {
      id: row.id,
      client_name: row.client_name,
      company_name: row.company_name,
      status: row.status,
      created_at: row.created_at,
      outsole_id: row.outsole_id ?? null,
      product_name: o?.name ?? null,
      product_model: o?.model_number ?? null,
    };
  });

  // Format recent products
  const recentProducts: RecentProductItem[] = (recentProductsRes.data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    model_number: row.model_number,
    status: row.status,
    is_featured: Boolean(row.is_featured),
    updated_at: row.updated_at,
  }));

  return {
    products: {
      total: productsTotalRes.count ?? 0,
      active: productsActiveRes.count ?? 0,
      draft: productsDraftRes.count ?? 0,
      archived: productsArchivedRes.count ?? 0,
    },
    inquiries: {
      total: inquiriesTotalRes.count ?? 0,
      pending: inquiriesPendingRes.count ?? 0,
      contacted: inquiriesContactedRes.count ?? 0,
      resolved: inquiriesResolvedRes.count ?? 0,
    },
    taxonomy: {
      categories: categoriesCountRes.count ?? 0,
      materials: materialsCountRes.count ?? 0,
      tractionTypes: tractionTypesCountRes.count ?? 0,
    },
    recentInquiries,
    recentProducts,
  };
}

// ============================================================================
// Server Function
// ============================================================================

/**
 * Server function: Fetches dashboard metrics, recent inquiries, and recent products.
 * Requires authenticated staff/admin session.
 */
export const getAdminDashboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminDashboardData> => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return await fetchDashboardMetrics(supabaseAdmin);
  },
);
