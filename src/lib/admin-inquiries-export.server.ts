import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import ExcelJS from "exceljs";

export type ExportInquiryItem = {
  id: string;
  client_name: string;
  company_name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  created_at: string;
  product_name: string;
  product_model: string;
  product_slug: string;
};

/**
 * Sanitizes cell values to prevent CSV / Spreadsheet formula injection (CWE-1236).
 * Any string beginning with '=', '+', '-', '@', '\t', '\r', or '|' is prefixed
 * with a single apostrophe (') so spreadsheet applications (Excel, LibreOffice,
 * Google Sheets) treat the content strictly as literal text rather than an
 * executable formula expression.
 */
export function sanitizeCellValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (/^[=+\-@\t\r|]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Generates an ISO-date-based filename for the export: `ode-inquiries-YYYY-MM-DD.xlsx`.
 */
export function generateExportFilename(date: Date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `ode-inquiries-${yyyy}-${mm}-${dd}.xlsx`;
}

export const EXPORT_BATCH_SIZE = 500;

/**
 * Queries all sample inquiries with joined outsole details from Supabase using
 * pagination batching to ensure complete data retrieval without hitting row limits.
 */
export async function fetchCompleteInquiriesForExport(
  client: SupabaseClient<Database>,
  batchSize: number = EXPORT_BATCH_SIZE,
): Promise<ExportInquiryItem[]> {
  let offset = 0;
  const allItems: ExportInquiryItem[] = [];
  let hasMore = true;

  while (hasMore) {
    const { data: rows, error } = await client
      .from("sample_inquiries")
      .select(
        `
        id,
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
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + batchSize - 1);

    if (error) {
      throw new Error(`Failed to fetch inquiries for export: ${error.message}`);
    }

    if (!rows || rows.length === 0) {
      break;
    }

    for (const r of rows) {
      const out = Array.isArray(r.outsoles) ? r.outsoles[0] : r.outsoles;
      allItems.push({
        id: r.id,
        client_name: r.client_name ?? "",
        company_name: r.company_name ?? "",
        email: r.email ?? "",
        phone: r.phone ?? null,
        message: r.message ?? "",
        status: r.status ?? "pending",
        created_at: r.created_at,
        product_name: out?.name ?? "General Inquiry",
        product_model: out?.model_number ?? "—",
        product_slug: out?.slug ?? "—",
      });
    }

    if (rows.length < batchSize) {
      hasMore = false;
    } else {
      offset += batchSize;
    }
  }

  return allItems;
}

/**
 * Builds an ExcelJS Workbook from inquiry items with styled headers, sensible
 * column widths, date formatting, autofilters, and formula injection protection.
 */
export function buildInquiriesWorkbook(inquiries: ExportInquiryItem[]): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ODE Outsole Web App";
  workbook.lastModifiedBy = "ODE Outsole Web App";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet("Sample Inquiries", {
    views: [{ state: "frozen", ySplit: 1 }],
    properties: { defaultRowHeight: 20 },
  });

  worksheet.columns = [
    { header: "Inquiry Date (UTC)", key: "created_at", width: 22 },
    { header: "Status", key: "status", width: 14 },
    { header: "Client Name", key: "client_name", width: 24 },
    { header: "Company / Organization", key: "company_name", width: 28 },
    { header: "Email", key: "email", width: 30 },
    { header: "Phone", key: "phone", width: 20 },
    { header: "Requested Product", key: "product_name", width: 26 },
    { header: "Product Model / SKU", key: "product_model", width: 20 },
    { header: "Message", key: "message", width: 48 },
    { header: "Inquiry ID", key: "id", width: 38 },
  ];

  // Header formatting (ODE Navy #083B7B)
  const headerRow = worksheet.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF083B7B" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "left",
      wrapText: false,
    };
    cell.border = {
      top: { style: "medium", color: { argb: "FF062D5E" } },
      bottom: { style: "medium", color: { argb: "FF062D5E" } },
      left: { style: "thin", color: { argb: "FF0D4B9B" } },
      right: { style: "thin", color: { argb: "FF0D4B9B" } },
    };
  });

  // Populate data rows
  for (const item of inquiries) {
    const parsedDate = new Date(item.created_at);
    const isValidDate = !isNaN(parsedDate.getTime());
    const dateVal = isValidDate ? parsedDate : item.created_at;

    const formattedStatus = item.status
      ? item.status.charAt(0).toUpperCase() + item.status.slice(1)
      : "Pending";

    const row = worksheet.addRow({
      created_at: dateVal,
      status: sanitizeCellValue(formattedStatus),
      client_name: sanitizeCellValue(item.client_name),
      company_name: sanitizeCellValue(item.company_name),
      email: sanitizeCellValue(item.email),
      phone: sanitizeCellValue(item.phone || "—"),
      product_name: sanitizeCellValue(item.product_name),
      product_model: sanitizeCellValue(item.product_model),
      message: sanitizeCellValue(item.message),
      id: sanitizeCellValue(item.id),
    });

    row.height = 22;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Calibri", size: 10, color: { argb: "FF292925" } };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFF3F4F6" } },
      };

      if (colNumber === 1 && isValidDate) {
        cell.numFmt = "yyyy-mm-dd hh:mm:ss";
        cell.alignment = { vertical: "top", horizontal: "center" };
      } else if (colNumber === 2) {
        cell.alignment = { vertical: "top", horizontal: "center" };
      } else if (colNumber === 9) {
        cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
      } else {
        cell.alignment = { vertical: "top", horizontal: "left" };
      }
    });
  }

  // AutoFilter covering all columns
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: worksheet.columns.length },
  };

  return workbook;
}

/**
 * Server-only execution helper for exporting inquiries.
 */
export async function executeAdminInquiriesExport(): Promise<{
  base64: string;
  filename: string;
  rowCount: number;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const inquiries = await fetchCompleteInquiriesForExport(supabaseAdmin);
  const workbook = buildInquiriesWorkbook(inquiries);
  const buffer = await workbook.xlsx.writeBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const filename = generateExportFilename();

  return {
    base64,
    filename,
    rowCount: inquiries.length,
  };
}
