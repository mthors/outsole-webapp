-- Migration: Bilingual CMS Content (Phase 3)
-- Adds title_en and content_en to public.site_content while preserving existing columns and records.
-- Indonesian (id) is stored in title / content.
-- English (en) is stored in title_en / content_en.

-- 1. Add bilingual columns
ALTER TABLE public.site_content
  ADD COLUMN IF NOT EXISTS title_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS content_en TEXT;

-- 2. Populate / Update Bilingual CMS Content

-- homepage_hero
UPDATE public.site_content
SET
  title = 'Outsole & Compound Berkinerja Tinggi',
  content = 'Dirancang untuk brand footwear yang bergerak cepat. Kami memproduksi outsole rubber, EVA, dan TPU teruji laboratorium dengan sampling cepat, harga langsung produsen, dan tanpa perantara.',
  title_en = 'High-Performance Outsole & Compound',
  content_en = 'Built for footwear brands moving fast. We deliver lab-tested rubber, EVA, and TPU outsoles with rapid sampling, direct-tier pricing, and zero middleman friction.'
WHERE content_key = 'homepage_hero';

-- homepage_capabilities
UPDATE public.site_content
SET
  title = 'Kemampuan Manufaktur',
  content = 'Pengembangan OEM dan ODM, pembuatan mold in-house, formulasi compound, pengujian abrasi dan ketahanan slip, serta produksi massal terukur.',
  title_en = 'Manufacturing Capabilities',
  content_en = 'OEM and ODM development, in-house mold making, compound formulation, abrasion and slip testing, and scaled volume production.'
WHERE content_key = 'homepage_capabilities';

-- about_company
UPDATE public.site_content
SET
  title = 'Tentang Pabrik Kami',
  content = 'Didirikan di Sidoarjo, Jawa Timur—salah satu pusat industri footwear utama di Indonesia—PT. Ode Cipta Semesta berkembang dari workshop komponen soling spesialis menjadi mitra manufaktur OEM dan komponen footwear terintegrasi. Sebagai anggota aktif APRISINDO (Asosiasi Persepatuan Indonesia), kami merancang dan memproduksi outsole presisi, unit sole, dan komponen cetak yang memasok brand footwear nasional terkemuka serta mitra ekspor global.',
  title_en = 'About the Factory',
  content_en = 'Founded in Sidoarjo, East Java—one of Indonesia’s primary industrial footwear hubs— PT. Ode Cipta Semesta has grown from a specialized soling component workshop into an integrated footwear component and OEM manufacturing partner. As an active member of APRISINDO (Indonesian Footwear Association), we engineer and manufacture precision outsoles, unit soles, and moulded components that power prominent national footwear brands as well as global export partners.'
WHERE content_key = 'about_company';

-- about_oem
UPDATE public.site_content
SET
  title = 'Manufaktur OEM',
  content = 'Produksi build-to-print presisi: transfer tooling, pencocokan compound, kontrol kualitas ketat, dan ketepatan waktu produksi yang terjamin.',
  title_en = 'OEM Manufacturing',
  content_en = 'Precision build-to-print production: tooling transfer, compound matching, rigorous quality control, and dependable production lead times.'
WHERE content_key = 'about_oem';

-- about_odm
UPDATE public.site_content
SET
  title = 'Pengembangan ODM',
  content = 'Pengembangan desain in-house: perancangan konsep, desain last dan tooling, siklus sampling cepat, serta pemilihan formulasi material khusus.',
  title_en = 'ODM Development',
  content_en = 'In-house design development: concept modeling, last and tooling design, rapid sampling cycles, and specialized material selection.'
WHERE content_key = 'about_odm';

-- contact_information
UPDATE public.site_content
SET
  title = 'Hubungi Kami',
  content = '{
  "intro": "Hubungi langsung tim insinyur compounding rubber, spesialis tooling mold, dan tim sales komersial kami untuk program OEM dan pengiriman sampel.",
  "facility": {
    "eyebrow": "Fasilitas",
    "heading": "PT ODE CIPTA SEMESTA",
    "name": "PT ODE CIPTA SEMESTA",
    "address": "Jl. Kidemang Singomenggolo No.KM 20 \nSidomulyo Buduran \nSidoarjo Jawa Timur \n61252",
    "footerNote": "Kunjungan audit pabrik berdasarkan perjanjian"
  },
  "directEmail": {
    "eyebrow": "Email Langsung",
    "heading": "Penjualan Outsole",
    "description": "Hubungi kami melalui email untuk spesifikasi teknis dan penawaran.",
    "email": "sales@ode.co.id",
    "footerNote": "Respons biasanya dalam < 24 jam kerja"
  },
  "phoneWhatsapp": {
    "eyebrow": "Saluran Langsung",
    "heading": "Telepon & WhatsApp",
    "description": "Bicara langsung dengan tim penjualan kami.",
    "phone": "(031) 8929186",
    "whatsapp": "+62 123-456-789 (WhatsApp)",
    "footerNote": "Melayani Bahasa Indonesia & English"
  },
  "operatingHours": {
    "eyebrow": "Jadwal Operasional",
    "heading": "Jam Operasional",
    "mondayFriday": "08:00 – 16:00",
    "saturday": "08:00 – 14:00",
    "sunday": "Tutup",
    "timezone": "Waktu Indonesia Barat (WIB / UTC+7)"
  }
}',
  title_en = 'Contact Us',
  content_en = '{
  "intro": "Connect directly with our rubber compounding engineers, tooling mold specialists, and commercial sales team for OEM programs and sample dispatch.",
  "facility": {
    "eyebrow": "Facility",
    "heading": "PT ODE CIPTA SEMESTA",
    "name": "PT ODE CIPTA SEMESTA",
    "address": "Jl. Kidemang Singomenggolo No.KM 20 \nSidomulyo Buduran \nSidoarjo Jawa Timur \n61252",
    "footerNote": "Factory audits by appointment"
  },
  "directEmail": {
    "eyebrow": "Direct Email",
    "heading": "Outsole Sales",
    "description": "Contact Us by e-mail.",
    "email": "sales@ode.co.id",
    "footerNote": "Typical response: < 24 business hours"
  },
  "phoneWhatsapp": {
    "eyebrow": "Direct Line",
    "heading": "Phone & WhatsApp",
    "description": "Speak directly with our sales team.",
    "phone": "(031) 8929186",
    "whatsapp": "+62 123-456-789 (WhatsApp)",
    "footerNote": "English & Indonesian supported"
  },
  "operatingHours": {
    "eyebrow": "Schedule",
    "heading": "Operating Hours",
    "mondayFriday": "08:00 – 16:00",
    "saturday": "08:00 – 14:00",
    "sunday": "Closed",
    "timezone": "Western Indonesia (UTC+7)"
  }
}'
WHERE content_key = 'contact_information';

-- interior_hero
-- Preserves existing imagePath while establishing bilingual metadata
UPDATE public.site_content
SET
  title = 'Latar Belakang Hero Halaman Interior',
  content = json_build_object(
    'imagePath', COALESCE((content::json->>'imagePath'), 'site/hero/interior/1790657176941-afab523d-gemini_generated_image_ez9rb1ez9rb1ez9r.jpg'),
    'altText', 'Fasilitas manufaktur ODE Outsole',
    'eyebrow', COALESCE((content::json->>'eyebrow'), ''),
    'title', COALESCE((content::json->>'title'), ''),
    'description', COALESCE((content::json->>'description'), '')
  )::text,
  title_en = 'Interior Pages Hero Background',
  content_en = json_build_object(
    'imagePath', COALESCE((content::json->>'imagePath'), 'site/hero/interior/1790657176941-afab523d-gemini_generated_image_ez9rb1ez9rb1ez9r.jpg'),
    'altText', 'ODE Outsole manufacturing facility',
    'eyebrow', COALESCE((content::json->>'eyebrow'), ''),
    'title', COALESCE((content::json->>'title'), ''),
    'description', COALESCE((content::json->>'description'), '')
  )::text
WHERE content_key = 'interior_hero';
