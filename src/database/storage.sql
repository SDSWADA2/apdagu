-- ============================================================================
-- APDAGU ENTERPRISE v2.0 — SUPABASE STORAGE BUCKETS & POLICIES
-- SD NEGERI SUMBER WARU 2 (KABUPATEN PAMEKASAN)
-- ============================================================================

-- Buat Buckets di storage.buckets (Jika belum ada)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('foto-guru', 'foto-guru', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('dokumen', 'dokumen', true, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('ijazah', 'ijazah', true, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('sertifikat', 'sertifikat', true, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('ttd', 'ttd', true, 2097152, ARRAY['image/png', 'image/webp', 'image/svg+xml']),
  ('logo', 'logo', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- STORAGE RLS POLICIES
-- ============================================================================
-- 1. Siapa pun dapat membaca berkas (Public View)
CREATE POLICY "Public Access Storage"
ON storage.objects FOR SELECT
USING (bucket_id IN ('foto-guru', 'dokumen', 'ijazah', 'sertifikat', 'ttd', 'logo'));

-- 2. Pengguna terautentikasi dapat mengunggah berkas
CREATE POLICY "Authenticated Users Can Upload"
ON storage.objects FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated' AND
    bucket_id IN ('foto-guru', 'dokumen', 'ijazah', 'sertifikat', 'ttd', 'logo')
);

-- 3. Pengguna terautentikasi dapat memperbarui berkas mereka
CREATE POLICY "Authenticated Users Can Update"
ON storage.objects FOR UPDATE
USING (
    auth.role() = 'authenticated' AND
    bucket_id IN ('foto-guru', 'dokumen', 'ijazah', 'sertifikat', 'ttd', 'logo')
);

-- 4. Admin dan Operator dapat menghapus berkas
CREATE POLICY "Admin/Operator Can Delete Storage"
ON storage.objects FOR DELETE
USING (
    auth.role() = 'authenticated' AND
    bucket_id IN ('foto-guru', 'dokumen', 'ijazah', 'sertifikat', 'ttd', 'logo')
);
