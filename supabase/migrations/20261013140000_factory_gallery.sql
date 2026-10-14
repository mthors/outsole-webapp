-- Migration: Factory Gallery Table & Seed Placeholders
-- Creates public.factory_gallery to manage factory facilities, machinery, process, and warehouse images.

CREATE TABLE IF NOT EXISTS public.factory_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'factory_office',
    'machinery_equipment',
    'production_process',
    'warehouse_storage'
  )),
  image_path TEXT NOT NULL,
  caption_id TEXT,
  caption_en TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_placeholder BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_factory_gallery_category ON public.factory_gallery(category);
CREATE INDEX IF NOT EXISTS idx_factory_gallery_published ON public.factory_gallery(is_published);
CREATE INDEX IF NOT EXISTS idx_factory_gallery_featured ON public.factory_gallery(is_featured);
CREATE INDEX IF NOT EXISTS idx_factory_gallery_order ON public.factory_gallery(display_order);

CREATE TRIGGER factory_gallery_updated_at BEFORE UPDATE ON public.factory_gallery
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Permissions
GRANT SELECT ON public.factory_gallery TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.factory_gallery TO authenticated;
GRANT ALL ON public.factory_gallery TO service_role;

-- RLS
ALTER TABLE public.factory_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "factory_gallery public read published" ON public.factory_gallery FOR SELECT
  USING (is_published = true OR private.is_staff(auth.uid()));

CREATE POLICY "factory_gallery staff write" ON public.factory_gallery FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

-- Initial Seed Placeholders (identifiable by is_placeholder = TRUE)
INSERT INTO public.factory_gallery (category, image_path, caption_id, caption_en, is_featured, is_published, display_order, is_placeholder)
VALUES
  (
    'factory_office',
    '/placeholders/factory-office.svg',
    '[Placeholder] Fasilitas manufaktur utama dan gedung kantor PT ODE Cipta Semesta di Sidoarjo, Jawa Timur.',
    '[Placeholder] Main manufacturing facilities and administrative headquarters of PT ODE Cipta Semesta in Sidoarjo, East Java.',
    TRUE,
    TRUE,
    1,
    TRUE
  ),
  (
    'machinery_equipment',
    '/placeholders/machinery-equipment.svg',
    '[Placeholder] Lini mesin press kompresi vulkanisasi hidrolik dan unit cetak mold outsole otomatis.',
    '[Placeholder] Hydraulic vulcanization compression press lines and automated outsole mold tooling units.',
    FALSE,
    TRUE,
    2,
    TRUE
  ),
  (
    'production_process',
    '/placeholders/production-process.svg',
    '[Placeholder] Proses pencampuran kompon karet, kalenderisasi sheet, dan pemangkasan presisi sol.',
    '[Placeholder] Rubber compound compounding, sheet calendering, and high-precision outsole edge trimming process.',
    FALSE,
    TRUE,
    3,
    TRUE
  ),
  (
    'warehouse_storage',
    '/placeholders/warehouse-storage.svg',
    '[Placeholder] Area pergudangan bahan baku polimer karet dan sistem penyimpanan inventaris outsole jadi siap kirim.',
    '[Placeholder] Raw polymer storage warehouse and finished outsole shipping inventory racking system.',
    FALSE,
    TRUE,
    4,
    TRUE
  )
ON CONFLICT DO NOTHING;
