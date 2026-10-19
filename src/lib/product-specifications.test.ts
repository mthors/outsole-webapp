import { describe, it, expect } from "bun:test";
import { createOutsoleSchema, updateOutsoleSchema } from "./admin-outsoles.functions";
import { en } from "./i18n/translations/en";
import { id } from "./i18n/translations/id";
import type { Outsole } from "./catalog-types";

// Helper replicating the public specification builder from src/routes/outsoles.$slug.tsx
function buildPublicSpecs(o: Pick<Outsole, "weight_grams" | "available_sizes">, dict: typeof en) {
  return [
    {
      label: dict.product.weight,
      value: o.weight_grams != null ? `${o.weight_grams}` : null,
    },
    {
      label: dict.product.availableSizes,
      value: o.available_sizes?.trim() ? o.available_sizes.trim() : null,
    },
  ].filter((s): s is { label: string; value: string } => Boolean(s.value));
}

describe("Product Technical Specifications - Locale Dictionaries", () => {
  it("provides exact English labels for simplified technical specifications", () => {
    expect(en.product.weight).toBe("Weight (gr)");
    expect(en.product.availableSizes).toBe("Available Sizes");
  });

  it("provides exact Indonesian labels for simplified technical specifications", () => {
    expect(id.product.weight).toBe("Berat (gr)");
    expect(id.product.availableSizes).toBe("Ukuran Tersedia");
  });
});

describe("Admin Outsole Schemas - Available Sizes Support", () => {
  const baseValidCreate = {
    name: "Trail Grip OS-01",
    slug: "trail-grip-os-01",
    model_number: "TG-OS-01",
  };

  it("validates and accepts flexible Available Sizes text (e.g. '38–45')", () => {
    const parsed = createOutsoleSchema.parse({
      ...baseValidCreate,
      available_sizes: "38–45",
      weight_grams: 320,
    });
    expect(parsed.available_sizes).toBe("38–45");
    expect(parsed.weight_grams).toBe(320);
  });

  it("accepts complex size ranges and formats", () => {
    const sizes = ["36-46", "EU 38–45 / US 6–12", "S, M, L, XL", "38, 39, 40, 41, 42"];
    for (const size of sizes) {
      const parsed = createOutsoleSchema.parse({
        ...baseValidCreate,
        available_sizes: size,
      });
      expect(parsed.available_sizes).toBe(size);
    }
  });

  it("handles null, empty string, or undefined available_sizes gracefully", () => {
    const withNull = createOutsoleSchema.parse({
      ...baseValidCreate,
      available_sizes: null,
    });
    expect(withNull.available_sizes).toBeNull();

    const withUndefined = createOutsoleSchema.parse({
      ...baseValidCreate,
    });
    expect(withUndefined.available_sizes).toBeUndefined();

    const withEmpty = createOutsoleSchema.parse({
      ...baseValidCreate,
      available_sizes: "",
    });
    expect(withEmpty.available_sizes).toBe("");
  });

  it("maintains backward compatibility when available_sizes is unset", () => {
    // Legacy product payload without available_sizes field
    const legacyPayload = {
      name: "Legacy Runner Sole",
      slug: "legacy-runner-sole",
      model_number: "LEGACY-001",
      weight_grams: 280,
    };
    expect(() => createOutsoleSchema.parse(legacyPayload)).not.toThrow();
  });

  it("validates updateOutsoleSchema with available_sizes", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    const parsed = updateOutsoleSchema.parse({
      id: validUuid,
      name: "Updated Outsole",
      slug: "updated-outsole",
      model_number: "UPD-001",
      available_sizes: "40–44",
      weight_grams: 350,
    });
    expect(parsed.available_sizes).toBe("40–44");
    expect(parsed.weight_grams).toBe(350);
  });
});

describe("Public Specifications Display Logic", () => {
  it("displays both Weight (gr) and Available Sizes when both exist (English)", () => {
    const outsole: Pick<Outsole, "weight_grams" | "available_sizes"> = {
      weight_grams: 320,
      available_sizes: "38–45",
    };
    const specs = buildPublicSpecs(outsole, en);

    expect(specs).toHaveLength(2);
    expect(specs[0]).toEqual({ label: "Weight (gr)", value: "320" });
    expect(specs[1]).toEqual({ label: "Available Sizes", value: "38–45" });
  });

  it("displays both Berat (gr) and Ukuran Tersedia when both exist (Indonesian)", () => {
    const outsole: Pick<Outsole, "weight_grams" | "available_sizes"> = {
      weight_grams: 320,
      available_sizes: "38–45",
    };
    const specs = buildPublicSpecs(outsole, id);

    expect(specs).toHaveLength(2);
    expect(specs[0]).toEqual({ label: "Berat (gr)", value: "320" });
    expect(specs[1]).toEqual({ label: "Ukuran Tersedia", value: "38–45" });
  });

  it("displays only Weight when Available Sizes is null or unset", () => {
    const outsoleNullSize: Pick<Outsole, "weight_grams" | "available_sizes"> = {
      weight_grams: 310,
      available_sizes: null,
    };
    const specsEn = buildPublicSpecs(outsoleNullSize, en);
    expect(specsEn).toHaveLength(1);
    expect(specsEn[0]).toEqual({ label: "Weight (gr)", value: "310" });

    const specsId = buildPublicSpecs(outsoleNullSize, id);
    expect(specsId).toHaveLength(1);
    expect(specsId[0]).toEqual({ label: "Berat (gr)", value: "310" });
  });

  it("displays only Available Sizes when Weight is null or unset", () => {
    const outsoleNullWeight: Pick<Outsole, "weight_grams" | "available_sizes"> = {
      weight_grams: null,
      available_sizes: "39–43",
    };
    const specsEn = buildPublicSpecs(outsoleNullWeight, en);
    expect(specsEn).toHaveLength(1);
    expect(specsEn[0]).toEqual({ label: "Available Sizes", value: "39–43" });

    const specsId = buildPublicSpecs(outsoleNullWeight, id);
    expect(specsId).toHaveLength(1);
    expect(specsId[0]).toEqual({ label: "Ukuran Tersedia", value: "39–43" });
  });

  it("returns empty specs array when both Weight and Available Sizes are missing", () => {
    const outsoleEmpty: Pick<Outsole, "weight_grams" | "available_sizes"> = {
      weight_grams: null,
      available_sizes: null,
    };
    const specs = buildPublicSpecs(outsoleEmpty, en);
    expect(specs).toHaveLength(0);
  });

  it("gracefully handles whitespace-only or empty available_sizes strings without rendering empty rows", () => {
    const outsoleBlankSize: Pick<Outsole, "weight_grams" | "available_sizes"> = {
      weight_grams: 290,
      available_sizes: "   ",
    };
    const specs = buildPublicSpecs(outsoleBlankSize, en);
    expect(specs).toHaveLength(1);
    expect(specs[0]).toEqual({ label: "Weight (gr)", value: "290" });
  });

  it("ensures Shore Hardness, DIN Abrasion, and Sampling are excluded from public specs", () => {
    // An outsole object with all fields populated
    const fullOutsole: Outsole = {
      id: "test-uuid",
      model_number: "OS-IP-01",
      name: "OS-IP-01",
      slug: "os-ip-01",
      description: "Sample description",
      shore_min: 55,
      shore_max: 60,
      shore_scale: "A",
      din_abrasion_mm3: 120,
      weight_grams: 340,
      available_sizes: "38–45",
      is_featured: true,
      is_sampling_available: true,
      status: "active",
      created_at: new Date().toISOString(),
      categories: [],
      materials: [],
      tractionTypes: [],
      images: [],
    };

    const specs = buildPublicSpecs(fullOutsole, en);
    const labels = specs.map((s) => s.label);

    // Only Weight (gr) and Available Sizes must be in the specifications
    expect(labels).toEqual(["Weight (gr)", "Available Sizes"]);
    expect(labels).not.toContain(en.product.shoreHardness);
    expect(labels).not.toContain(en.product.dinAbrasion);
    expect(labels).not.toContain(en.product.sampling);
  });
});
