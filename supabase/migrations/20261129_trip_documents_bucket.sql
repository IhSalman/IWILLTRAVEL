-- Private storage for generated itinerary PDFs: trip-documents/{user_id}/{itinerary_id}.pdf
-- The server uploads with the service role; users may read only their own folder.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('trip-documents', 'trip-documents', false, 26214400, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users read own trip documents" ON storage.objects;
CREATE POLICY "Users read own trip documents" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'trip-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
