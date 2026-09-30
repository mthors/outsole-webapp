import { z } from "zod";

// ============================================================================
// Schemas & Types for CMS-managed Contact Page Cards
// ============================================================================

export const facilitySchema = z.object({
  eyebrow: z
    .string()
    .trim()
    .min(1, "Facility label is required")
    .max(100, "Facility label must not exceed 100 characters"),
  heading: z
    .string()
    .trim()
    .min(1, "Facility heading is required")
    .max(100, "Facility heading must not exceed 100 characters"),
  name: z
    .string()
    .trim()
    .min(1, "Facility name is required")
    .max(200, "Facility name must not exceed 200 characters"),
  address: z
    .string()
    .trim()
    .min(1, "Facility address is required")
    .max(500, "Facility address must not exceed 500 characters"),
  footerNote: z
    .string()
    .trim()
    .min(1, "Facility footer note is required")
    .max(200, "Facility footer note must not exceed 200 characters"),
});

export const directEmailSchema = z.object({
  eyebrow: z
    .string()
    .trim()
    .min(1, "Email label is required")
    .max(100, "Email label must not exceed 100 characters"),
  heading: z
    .string()
    .trim()
    .min(1, "Email heading is required")
    .max(100, "Email heading must not exceed 100 characters"),
  description: z
    .string()
    .trim()
    .min(1, "Email description is required")
    .max(500, "Email description must not exceed 500 characters"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please provide a valid email address")
    .max(255, "Email must not exceed 255 characters"),
  footerNote: z
    .string()
    .trim()
    .min(1, "Email footer note is required")
    .max(200, "Email footer note must not exceed 200 characters"),
});

export const phoneWhatsappSchema = z.object({
  eyebrow: z
    .string()
    .trim()
    .min(1, "Phone label is required")
    .max(100, "Phone label must not exceed 100 characters"),
  heading: z
    .string()
    .trim()
    .min(1, "Phone heading is required")
    .max(100, "Phone heading must not exceed 100 characters"),
  description: z
    .string()
    .trim()
    .min(1, "Phone description is required")
    .max(500, "Phone description must not exceed 500 characters"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .max(100, "Phone number must not exceed 100 characters"),
  whatsapp: z
    .string()
    .trim()
    .min(1, "WhatsApp number is required")
    .max(100, "WhatsApp number must not exceed 100 characters"),
  footerNote: z
    .string()
    .trim()
    .min(1, "Phone footer note is required")
    .max(200, "Phone footer note must not exceed 200 characters"),
});

export const operatingHoursSchema = z.object({
  eyebrow: z
    .string()
    .trim()
    .min(1, "Schedule label is required")
    .max(100, "Schedule label must not exceed 100 characters"),
  heading: z
    .string()
    .trim()
    .min(1, "Operating hours heading is required")
    .max(100, "Operating hours heading must not exceed 100 characters"),
  mondayFriday: z
    .string()
    .trim()
    .min(1, "Monday–Friday hours are required")
    .max(100, "Monday–Friday hours must not exceed 100 characters"),
  saturday: z
    .string()
    .trim()
    .min(1, "Saturday hours are required")
    .max(100, "Saturday hours must not exceed 100 characters"),
  sunday: z
    .string()
    .trim()
    .min(1, "Sunday hours are required")
    .max(100, "Sunday hours must not exceed 100 characters"),
  timezone: z
    .string()
    .trim()
    .min(1, "Timezone is required")
    .max(100, "Timezone must not exceed 100 characters"),
});

export const contactContentSchema = z.object({
  intro: z
    .string()
    .trim()
    .max(1000, "Intro must not exceed 1000 characters")
    .default(""),
  facility: facilitySchema,
  directEmail: directEmailSchema,
  phoneWhatsapp: phoneWhatsappSchema,
  operatingHours: operatingHoursSchema,
});

export type FacilityContent = z.infer<typeof facilitySchema>;
export type DirectEmailContent = z.infer<typeof directEmailSchema>;
export type PhoneWhatsappContent = z.infer<typeof phoneWhatsappSchema>;
export type OperatingHoursContent = z.infer<typeof operatingHoursSchema>;
export type ContactContent = z.infer<typeof contactContentSchema>;

// ============================================================================
// Authentic Baseline Defaults Preserving Current Visible Contact Page
// ============================================================================

export const DEFAULT_CONTACT_CONTENT: ContactContent = {
  intro:
    "Connect directly with our rubber compounding engineers, tooling mold specialists, and commercial sales team for OEM programs and sample dispatch.",
  facility: {
    eyebrow: "Facility",
    heading: "PT ODE CIPTA SEMESTA",
    name: "PT ODE CIPTA SEMESTA",
    address:
      "Jl. Kidemang Singomenggolo No.KM 20 \nSidomulyo Buduran \nSidoarjo Jawa Timur \n61252",
    footerNote: "Factory audits by appointment",
  },
  directEmail: {
    eyebrow: "Direct Email",
    heading: "Outsole Sales",
    description: "Contact Us by e-mail.",
    email: "sales@ode.co.id",
    footerNote: "Typical response: < 24 business hours",
  },
  phoneWhatsapp: {
    eyebrow: "Direct Line",
    heading: "Phone & WhatsApp",
    description: "Speak directly with our sales team.",
    phone: "(031) 8929186",
    whatsapp: "+62 123-456-789 (WhatsApp)",
    footerNote: "English & Indonesian supported",
  },
  operatingHours: {
    eyebrow: "Schedule",
    heading: "Operating Hours",
    mondayFriday: "08:00 – 16:00",
    saturday: "08:00 – 14:00",
    sunday: "Closed",
    timezone: "Western Indonesia (UTC+7)",
  },
};

export const DEFAULT_CONTACT_CONTENT_ID: ContactContent = {
  intro:
    "Hubungi langsung tim insinyur compounding rubber, spesialis tooling mold, dan tim sales komersial kami untuk program OEM dan pengiriman sampel.",
  facility: {
    eyebrow: "Fasilitas",
    heading: "PT ODE CIPTA SEMESTA",
    name: "PT ODE CIPTA SEMESTA",
    address:
      "Jl. Kidemang Singomenggolo No.KM 20 \nSidomulyo Buduran \nSidoarjo Jawa Timur \n61252",
    footerNote: "Kunjungan audit pabrik berdasarkan perjanjian",
  },
  directEmail: {
    eyebrow: "Email Langsung",
    heading: "Penjualan Outsole",
    description: "Hubungi kami melalui email untuk spesifikasi teknis dan penawaran.",
    email: "sales@ode.co.id",
    footerNote: "Respons biasanya dalam < 24 jam kerja",
  },
  phoneWhatsapp: {
    eyebrow: "Saluran Langsung",
    heading: "Telepon & WhatsApp",
    description: "Bicara langsung dengan tim penjualan kami.",
    phone: "(031) 8929186",
    whatsapp: "+62 123-456-789 (WhatsApp)",
    footerNote: "Melayani Bahasa Indonesia & English",
  },
  operatingHours: {
    eyebrow: "Jadwal Operasional",
    heading: "Jam Operasional",
    mondayFriday: "08:00 – 16:00",
    saturday: "08:00 – 14:00",
    sunday: "Tutup",
    timezone: "Waktu Indonesia Barat (WIB / UTC+7)",
  },
};

// ============================================================================
// Helper Utilities for Link Formatting & Resilient Content Parsing
// ============================================================================

export function formatPhoneLink(phone: string): string | null {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned || cleaned === "+") return null;
  return `tel:${cleaned}`;
}

export function formatWhatsAppLink(whatsapp: string): string | null {
  const digits = whatsapp.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

/**
 * Parses raw site_content.content for contact_information.
 * Supports structured JSON representation with graceful fallback to authentic defaults
 * if content is unparsed, empty, or legacy plain text.
 */
export function parseContactContent(raw: string | null | undefined): ContactContent {
  if (!raw || !raw.trim()) {
    return DEFAULT_CONTACT_CONTENT;
  }

  try {
    const parsed = JSON.parse(raw);
    const result = contactContentSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
  } catch {
    // Non-JSON (legacy plain text string)
  }

  const cleaned = raw.replace(/^Editable placeholder\.?\s*/i, "").trim();
  return {
    ...DEFAULT_CONTACT_CONTENT,
    intro: cleaned || DEFAULT_CONTACT_CONTENT.intro,
  };
}
