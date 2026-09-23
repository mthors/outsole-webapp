CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(UUID, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_staff(UUID) TO anon, authenticated;

-- swap policies over to the private helpers
DROP POLICY "own profile readable" ON public.user_profiles;
CREATE POLICY "own profile readable" ON public.user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR private.is_staff(auth.uid()));

DROP POLICY "staff read roles" ON public.user_roles;
CREATE POLICY "staff read roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(),'admin'));
DROP POLICY "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

DROP POLICY "categories staff write" ON public.categories;
CREATE POLICY "categories staff write" ON public.categories FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
DROP POLICY "materials staff write" ON public.materials;
CREATE POLICY "materials staff write" ON public.materials FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
DROP POLICY "traction staff write" ON public.traction_types;
CREATE POLICY "traction staff write" ON public.traction_types FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY "outsoles public read active" ON public.outsoles;
CREATE POLICY "outsoles public read active" ON public.outsoles FOR SELECT
  USING (status = 'active' OR private.is_staff(auth.uid()));
DROP POLICY "outsoles staff write" ON public.outsoles;
CREATE POLICY "outsoles staff write" ON public.outsoles FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY "outsole_categories public read" ON public.outsole_categories;
CREATE POLICY "outsole_categories public read" ON public.outsole_categories FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.outsoles o WHERE o.id = outsole_id AND (o.status = 'active' OR private.is_staff(auth.uid()))));
DROP POLICY "outsole_categories staff write" ON public.outsole_categories;
CREATE POLICY "outsole_categories staff write" ON public.outsole_categories FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY "outsole_materials public read" ON public.outsole_materials;
CREATE POLICY "outsole_materials public read" ON public.outsole_materials FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.outsoles o WHERE o.id = outsole_id AND (o.status = 'active' OR private.is_staff(auth.uid()))));
DROP POLICY "outsole_materials staff write" ON public.outsole_materials;
CREATE POLICY "outsole_materials staff write" ON public.outsole_materials FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY "outsole_traction public read" ON public.outsole_traction_types;
CREATE POLICY "outsole_traction public read" ON public.outsole_traction_types FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.outsoles o WHERE o.id = outsole_id AND (o.status = 'active' OR private.is_staff(auth.uid()))));
DROP POLICY "outsole_traction staff write" ON public.outsole_traction_types;
CREATE POLICY "outsole_traction staff write" ON public.outsole_traction_types FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY "outsole_images public read" ON public.outsole_images;
CREATE POLICY "outsole_images public read" ON public.outsole_images FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.outsoles o WHERE o.id = outsole_id AND (o.status = 'active' OR private.is_staff(auth.uid()))));
DROP POLICY "outsole_images staff write" ON public.outsole_images;
CREATE POLICY "outsole_images staff write" ON public.outsole_images FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY "staff read inquiries" ON public.sample_inquiries;
CREATE POLICY "staff read inquiries" ON public.sample_inquiries FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));
DROP POLICY "staff update inquiries" ON public.sample_inquiries;
CREATE POLICY "staff update inquiries" ON public.sample_inquiries FOR UPDATE TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
DROP POLICY "staff delete inquiries" ON public.sample_inquiries;
CREATE POLICY "staff delete inquiries" ON public.sample_inquiries FOR DELETE TO authenticated
  USING (private.is_staff(auth.uid()));

DROP POLICY "site_content staff write" ON public.site_content;
CREATE POLICY "site_content staff write" ON public.site_content FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role);
DROP FUNCTION IF EXISTS public.is_staff(UUID);
DROP FUNCTION IF EXISTS public.handle_new_user();