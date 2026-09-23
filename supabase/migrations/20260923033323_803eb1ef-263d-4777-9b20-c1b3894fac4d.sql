-- ============ roles ============
CREATE TYPE public.app_role AS ENUM ('admin','editor');

CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY,
  full_name VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE POLICY "own profile readable" ON public.user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own profile writable" ON public.user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own profile insert" ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "staff read roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ shared helpers ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ taxonomy ============
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.traction_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.materials TO anon;
GRANT SELECT ON public.traction_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.traction_types TO authenticated;
GRANT ALL ON public.categories TO service_role;
GRANT ALL ON public.materials TO service_role;
GRANT ALL ON public.traction_types TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traction_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories staff write" ON public.categories FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "materials public read" ON public.materials FOR SELECT USING (true);
CREATE POLICY "materials staff write" ON public.materials FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "traction public read" ON public.traction_types FOR SELECT USING (true);
CREATE POLICY "traction staff write" ON public.traction_types FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============ outsoles ============
CREATE TABLE public.outsoles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_number VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,
  shore_min SMALLINT CHECK (shore_min IS NULL OR shore_min > 0),
  shore_max SMALLINT CHECK (shore_max IS NULL OR shore_max > 0),
  shore_scale VARCHAR(10) NOT NULL DEFAULT 'A',
  din_abrasion_mm3 DECIMAL(8,2) CHECK (din_abrasion_mm3 IS NULL OR din_abrasion_mm3 > 0),
  weight_grams INTEGER CHECK (weight_grams IS NULL OR weight_grams > 0),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_sampling_available BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shore_range_valid CHECK (shore_min IS NULL OR shore_max IS NULL OR shore_min <= shore_max)
);
CREATE INDEX idx_outsoles_status ON public.outsoles(status);
CREATE INDEX idx_outsoles_slug ON public.outsoles(slug);
CREATE INDEX idx_outsoles_model_number ON public.outsoles(model_number);
CREATE INDEX idx_outsoles_featured ON public.outsoles(is_featured);
CREATE INDEX idx_outsoles_sampling ON public.outsoles(is_sampling_available);
CREATE TRIGGER outsoles_updated_at BEFORE UPDATE ON public.outsoles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.outsole_categories (
  outsole_id UUID NOT NULL REFERENCES public.outsoles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (outsole_id, category_id)
);
CREATE INDEX idx_outsole_categories_category ON public.outsole_categories(category_id);

CREATE TABLE public.outsole_materials (
  outsole_id UUID NOT NULL REFERENCES public.outsoles(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  PRIMARY KEY (outsole_id, material_id)
);
CREATE INDEX idx_outsole_materials_material ON public.outsole_materials(material_id);

CREATE TABLE public.outsole_traction_types (
  outsole_id UUID NOT NULL REFERENCES public.outsoles(id) ON DELETE CASCADE,
  traction_type_id UUID NOT NULL REFERENCES public.traction_types(id) ON DELETE CASCADE,
  PRIMARY KEY (outsole_id, traction_type_id)
);
CREATE INDEX idx_outsole_traction_traction ON public.outsole_traction_types(traction_type_id);

CREATE TABLE public.outsole_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outsole_id UUID NOT NULL REFERENCES public.outsoles(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(255),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_outsole_images_outsole ON public.outsole_images(outsole_id);
CREATE UNIQUE INDEX unique_primary_outsole_image ON public.outsole_images (outsole_id) WHERE is_primary = TRUE;

GRANT SELECT ON public.outsoles TO anon;
GRANT SELECT ON public.outsole_categories TO anon;
GRANT SELECT ON public.outsole_materials TO anon;
GRANT SELECT ON public.outsole_traction_types TO anon;
GRANT SELECT ON public.outsole_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outsoles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outsole_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outsole_materials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outsole_traction_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outsole_images TO authenticated;
GRANT ALL ON public.outsoles TO service_role;
GRANT ALL ON public.outsole_categories TO service_role;
GRANT ALL ON public.outsole_materials TO service_role;
GRANT ALL ON public.outsole_traction_types TO service_role;
GRANT ALL ON public.outsole_images TO service_role;

ALTER TABLE public.outsoles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outsole_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outsole_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outsole_traction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outsole_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outsoles public read active" ON public.outsoles FOR SELECT
  USING (status = 'active' OR public.is_staff(auth.uid()));
CREATE POLICY "outsoles staff write" ON public.outsoles FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "outsole_categories public read" ON public.outsole_categories FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.outsoles o WHERE o.id = outsole_id AND (o.status = 'active' OR public.is_staff(auth.uid()))));
CREATE POLICY "outsole_categories staff write" ON public.outsole_categories FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "outsole_materials public read" ON public.outsole_materials FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.outsoles o WHERE o.id = outsole_id AND (o.status = 'active' OR public.is_staff(auth.uid()))));
CREATE POLICY "outsole_materials staff write" ON public.outsole_materials FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "outsole_traction public read" ON public.outsole_traction_types FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.outsoles o WHERE o.id = outsole_id AND (o.status = 'active' OR public.is_staff(auth.uid()))));
CREATE POLICY "outsole_traction staff write" ON public.outsole_traction_types FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "outsole_images public read" ON public.outsole_images FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.outsoles o WHERE o.id = outsole_id AND (o.status = 'active' OR public.is_staff(auth.uid()))));
CREATE POLICY "outsole_images staff write" ON public.outsole_images FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============ inquiries ============
CREATE TABLE public.sample_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outsole_id UUID REFERENCES public.outsoles(id) ON DELETE SET NULL,
  client_name VARCHAR(100) NOT NULL,
  company_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','contacted','resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inquiries_status ON public.sample_inquiries(status);
CREATE INDEX idx_inquiries_created_at ON public.sample_inquiries(created_at DESC);
CREATE INDEX idx_inquiries_outsole ON public.sample_inquiries(outsole_id);

GRANT SELECT, UPDATE, DELETE ON public.sample_inquiries TO authenticated;
GRANT ALL ON public.sample_inquiries TO service_role;

ALTER TABLE public.sample_inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read inquiries" ON public.sample_inquiries FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "staff update inquiries" ON public.sample_inquiries FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff delete inquiries" ON public.sample_inquiries FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

-- ============ site content ============
CREATE TABLE public.site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255),
  content TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_content TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_content public read" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "site_content staff write" ON public.site_content FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER site_content_updated_at BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ seed ============
INSERT INTO public.categories (name, slug) VALUES
  ('Running','running'),('Trail','trail'),('Hiking','hiking'),('Lifestyle','lifestyle'),
  ('Casual','casual'),('Safety','safety'),('Workwear','workwear'),('Industrial','industrial');

INSERT INTO public.materials (name, description) VALUES
  ('Natural Rubber','High-resilience natural rubber with balanced grip and abrasion life.'),
  ('Recycled Rubber','Post-industrial recycled rubber content for lower-impact production.'),
  ('EVA','Lightweight closed-cell foam for cushioning-led constructions.'),
  ('Recycled EVA','Reground EVA compound for lower-impact midsole and outsole work.'),
  ('TPU','Thermoplastic polyurethane for stability elements and high-wear zones.'),
  ('Rubber Compound','Engineered blend tuned for road abrasion and rebound.'),
  ('High Abrasion Compound','Dense compound for extended wear in industrial use.');

INSERT INTO public.traction_types (name, description) VALUES
  ('Deep Lug','Aggressive lug depth for soft ground and loose terrain.'),
  ('Multi-Directional','Lug geometry tuned for lateral and braking grip.'),
  ('Wet Grip','Compound and siping optimised for wet surfaces.'),
  ('Slip Resistant','Tested pattern for oily and smooth industrial floors.'),
  ('All-Terrain','Mixed-surface pattern for varied ground.'),
  ('Road','Low-profile pattern for paved surfaces.'),
  ('Trail','Trail-specific lug spacing with mud release.'),
  ('Rocky Terrain','Edging-focused geometry for rock contact.'),
  ('Urban','Flat-contact pattern for city wear.');

INSERT INTO public.outsoles (model_number, name, slug, description, shore_min, shore_max, shore_scale, din_abrasion_mm3, weight_grams, is_featured, is_sampling_available, status) VALUES
  ('OUT-TRAIL-001','Trail Grip X1','trail-grip-x1','Deep-lug natural rubber outsole developed for loose trail and wet rock. Self-clearing lug spacing with a reinforced heel brake zone.',55,65,'A',120.00,210,TRUE,TRUE,'active'),
  ('OUT-RUN-002','RoadFlex R2','roadflex-r2','Low-profile road compound with multi-directional forefoot flex grooves and a high-rebound crash pad.',60,65,'A',110.00,190,TRUE,TRUE,'active'),
  ('OUT-SAFE-003','SafeStep S3','safestep-s3','High abrasion compound engineered for oily industrial floors, with a closed-channel slip resistant tread.',65,75,'A',100.00,280,FALSE,FALSE,'active');

INSERT INTO public.outsole_categories (outsole_id, category_id)
SELECT o.id, c.id FROM public.outsoles o JOIN public.categories c ON
  (o.slug='trail-grip-x1' AND c.slug IN ('trail','hiking')) OR
  (o.slug='roadflex-r2' AND c.slug IN ('running','lifestyle')) OR
  (o.slug='safestep-s3' AND c.slug IN ('safety','industrial'));

INSERT INTO public.outsole_materials (outsole_id, material_id)
SELECT o.id, m.id FROM public.outsoles o JOIN public.materials m ON
  (o.slug='trail-grip-x1' AND m.name='Natural Rubber') OR
  (o.slug='roadflex-r2' AND m.name='Rubber Compound') OR
  (o.slug='safestep-s3' AND m.name='High Abrasion Compound');

INSERT INTO public.outsole_traction_types (outsole_id, traction_type_id)
SELECT o.id, t.id FROM public.outsoles o JOIN public.traction_types t ON
  (o.slug='trail-grip-x1' AND t.name IN ('Deep Lug','Wet Grip')) OR
  (o.slug='roadflex-r2' AND t.name IN ('Road','Multi-Directional')) OR
  (o.slug='safestep-s3' AND t.name IN ('Slip Resistant'));

INSERT INTO public.site_content (content_key, title, content) VALUES
  ('homepage_hero','Engineered Grip. Designed for Performance.','Editable placeholder. Outsole tooling, compound development and volume production for footwear brands that specify performance at the ground contact.'),
  ('homepage_capabilities','Capability','Editable placeholder. OEM and ODM development, in-house mold making, compound formulation, abrasion and slip testing, and scaled production.'),
  ('about_company','About the factory','Editable placeholder company overview. Replace this text from the admin panel with your real company history, location and scale.'),
  ('about_oem','OEM','Editable placeholder. Describe build-to-print production: tooling transfer, compound matching, quality control and lead times.'),
  ('about_odm','ODM','Editable placeholder. Describe in-house design development: concept, last and tooling design, sampling cycles and material selection.'),
  ('contact_information','Contact','Editable placeholder. Address, email, phone, WhatsApp and business hours are set from the admin panel.');