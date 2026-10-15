-- Migration: Factory Information Rows Table
-- Creates public.factory_info_rows for the two About page factory information rows.

CREATE TABLE IF NOT EXISTS public.factory_info_rows (
  id VARCHAR(20) PRIMARY KEY CHECK (id IN ('row_1', 'row_2')),
  row_order INTEGER NOT NULL DEFAULT 1 CHECK (row_order IN (1, 2)),
  title_id TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL DEFAULT '',
  description_id TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  image_path TEXT,
  alt_text_id TEXT NOT NULL DEFAULT '',
  alt_text_en TEXT NOT NULL DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_factory_info_rows_order UNIQUE (row_order)
);

CREATE INDEX IF NOT EXISTS idx_factory_info_rows_order ON public.factory_info_rows(row_order);
CREATE INDEX IF NOT EXISTS idx_factory_info_rows_published ON public.factory_info_rows(is_published);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS factory_info_rows_updated_at ON public.factory_info_rows;
CREATE TRIGGER factory_info_rows_updated_at BEFORE UPDATE ON public.factory_info_rows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Permissions
GRANT SELECT ON public.factory_info_rows TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.factory_info_rows TO authenticated;
GRANT ALL ON public.factory_info_rows TO service_role;

-- Row Level Security
ALTER TABLE public.factory_info_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "factory_info_rows public read published" ON public.factory_info_rows FOR SELECT
  USING (is_published = true OR private.is_staff(auth.uid()));

CREATE POLICY "factory_info_rows staff write" ON public.factory_info_rows FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

-- Initial Seed Data: Exactly two rows
INSERT INTO public.factory_info_rows (
  id,
  row_order,
  title_id,
  title_en,
  description_id,
  description_en,
  image_path,
  alt_text_id,
  alt_text_en,
  is_published
)
VALUES
  (
    'row_1',
    1,
    'Lini Pengepresan & Vulkanisasi Outsole',
    'Outsole Pressing & Vulcanization Lines',
    'Pengoperasian mesin press hidrolik multi-rongga dengan kendali temperatur presisi, mendukung stabilitas pematangan kompon karet dan konsistensi dimensi untuk setiap cetakan outsole.',
    'Multi-cavity hydraulic press lines operated under precise temperature regulation, ensuring uniform rubber compound curing and dimensional consistency across every outsole moulding.',
    '/placeholders/machinery-equipment.svg',
    'Skematik mesin press vulkanisasi dan lini peralatan outsole ODE',
    'Schematic of ODE outsole vulcanization press machinery and production line',
    TRUE
  ),
  (
    'row_2',
    2,
    'Formulasi Kompon & Pemrosesan Material',
    'Compound Formulation & Material Processing',
    'Proses pencampuran bahan baku karet, penyesuaian elastisitas dan ketahanan aus, serta pemantauan reologi terstandar sebelum dialirkan ke tahap pencetakan outsole.',
    'Standardized rubber raw material compounding, elasticity and abrasion tuning, and continuous rheological monitoring prior to high-volume outsole moulding cycles.',
    '/placeholders/production-process.svg',
    'Diagram alur proses pencampuran kompon dan pembentukan outsole ODE',
    'Process flow diagram of ODE outsole compound mixing and moulding operations',
    TRUE
  )
ON CONFLICT (id) DO NOTHING;
