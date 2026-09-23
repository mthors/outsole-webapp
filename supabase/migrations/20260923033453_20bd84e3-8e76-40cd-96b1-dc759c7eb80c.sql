CREATE POLICY "outsole images readable" ON storage.objects FOR SELECT
  USING (bucket_id = 'outsole-images');
CREATE POLICY "staff upload outsole images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'outsole-images' AND private.is_staff(auth.uid()));
CREATE POLICY "staff update outsole images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'outsole-images' AND private.is_staff(auth.uid()));
CREATE POLICY "staff delete outsole images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'outsole-images' AND private.is_staff(auth.uid()));