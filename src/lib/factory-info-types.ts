export type FactoryInfoRowId = "row_1" | "row_2";

export interface FactoryInfoRowItem {
  id: FactoryInfoRowId;
  row_order: number;
  title_id: string;
  title_en: string;
  description_id: string;
  description_en: string;
  image_path: string | null;
  image_url: string | null;
  alt_text_id: string;
  alt_text_en: string;
  is_published: boolean;
  is_placeholder?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_FACTORY_INFO_ROWS: FactoryInfoRowItem[] = [
  {
    id: "row_1",
    row_order: 1,
    title_id: "Lini Pengepresan & Vulkanisasi Outsole",
    title_en: "Outsole Pressing & Vulcanization Lines",
    description_id:
      "Pengoperasian mesin press hidrolik multi-rongga dengan kendali temperatur presisi, mendukung stabilitas pematangan kompon karet dan konsistensi dimensi untuk setiap cetakan outsole.",
    description_en:
      "Multi-cavity hydraulic press lines operated under precise temperature regulation, ensuring uniform rubber compound curing and dimensional consistency across every outsole moulding.",
    image_path: "/placeholders/machinery-equipment.svg",
    image_url: "/placeholders/machinery-equipment.svg",
    alt_text_id: "Skematik mesin press vulkanisasi dan lini peralatan outsole ODE",
    alt_text_en: "Schematic of ODE outsole vulcanization press machinery and production line",
    is_published: true,
    is_placeholder: true,
  },
  {
    id: "row_2",
    row_order: 2,
    title_id: "Formulasi Kompon & Pemrosesan Material",
    title_en: "Compound Formulation & Material Processing",
    description_id:
      "Proses pencampuran bahan baku karet, penyesuaian elastisitas dan ketahanan aus, serta pemantauan reologi terstandar sebelum dialirkan ke tahap pencetakan outsole.",
    description_en:
      "Standardized rubber raw material compounding, elasticity and abrasion tuning, and continuous rheological monitoring prior to high-volume outsole moulding cycles.",
    image_path: "/placeholders/production-process.svg",
    image_url: "/placeholders/production-process.svg",
    alt_text_id: "Diagram alur proses pencampuran kompon dan pembentukan outsole ODE",
    alt_text_en: "Process flow diagram of ODE outsole compound mixing and moulding operations",
    is_published: true,
    is_placeholder: true,
  },
];
