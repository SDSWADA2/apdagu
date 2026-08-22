-- ============================================================================
-- APDAGU ENTERPRISE v2.0 — SUPABASE POSTGRESQL ROW LEVEL SECURITY (RLS) POLICIES
-- SD NEGERI SUMBER WARU 2 (KABUPATEN PAMEKASAN)
-- ============================================================================

-- Aktifkan RLS untuk Seluruh Tabel
ALTER TABLE public.profil_sekolah       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guru                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kepegawaian          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pendidikan           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sertifikasi          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jadwal_mengajar      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beban_mengajar       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pkg                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestasi             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pelatihan            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dokumen              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengaturan_aplikasi  ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS UNTUK ROLE CHECKING
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
    SELECT COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), 'guru');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT public.get_current_user_role() = 'admin';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_or_operator()
RETURNS BOOLEAN AS $$
    SELECT public.get_current_user_role() IN ('admin', 'operator');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_guru_id()
RETURNS UUID AS $$
    SELECT guru_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- 1. POLICIES: PROFIL SEKOLAH
-- ============================================================================
CREATE POLICY "ps_select" ON public.profil_sekolah FOR SELECT USING (true);
CREATE POLICY "ps_insert" ON public.profil_sekolah FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "ps_update" ON public.profil_sekolah FOR UPDATE USING (public.is_admin_or_operator());
CREATE POLICY "ps_delete" ON public.profil_sekolah FOR DELETE USING (public.is_admin()); -- Operator DILARANG menghapus profil sekolah

-- ============================================================================
-- 2. POLICIES: PROFILES (AUTH USERS)
-- ============================================================================
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE USING (public.is_admin());

-- ============================================================================
-- 3. POLICIES: GURU (MASTER DATA)
-- ============================================================================
-- Guru dapat melihat semua data guru; Admin & Operator CRUD; Guru dapat edit profil sendiri
CREATE POLICY "guru_select" ON public.guru FOR SELECT USING (true);
CREATE POLICY "guru_insert" ON public.guru FOR INSERT WITH CHECK (public.is_admin_or_operator());
CREATE POLICY "guru_update" ON public.guru FOR UPDATE USING (
    public.is_admin_or_operator() OR id = public.get_user_guru_id()
);
CREATE POLICY "guru_delete" ON public.guru FOR DELETE USING (public.is_admin_or_operator());

-- ============================================================================
-- 4. POLICIES: KEPEGAWAIAN
-- ============================================================================
CREATE POLICY "kepeg_select" ON public.kepegawaian FOR SELECT USING (true);
CREATE POLICY "kepeg_insert" ON public.kepegawaian FOR INSERT WITH CHECK (public.is_admin_or_operator());
CREATE POLICY "kepeg_update" ON public.kepegawaian FOR UPDATE USING (
    public.is_admin_or_operator() OR guru_id = public.get_user_guru_id()
);
CREATE POLICY "kepeg_delete" ON public.kepegawaian FOR DELETE USING (public.is_admin_or_operator());

-- ============================================================================
-- 5. POLICIES: PENDIDIKAN
-- ============================================================================
CREATE POLICY "pend_select" ON public.pendidikan FOR SELECT USING (true);
CREATE POLICY "pend_insert" ON public.pendidikan FOR INSERT WITH CHECK (
    public.is_admin_or_operator() OR guru_id = public.get_user_guru_id()
);
CREATE POLICY "pend_update" ON public.pendidikan FOR UPDATE USING (
    public.is_admin_or_operator() OR guru_id = public.get_user_guru_id()
);
CREATE POLICY "pend_delete" ON public.pendidikan FOR DELETE USING (public.is_admin_or_operator());

-- ============================================================================
-- 6. POLICIES: SERTIFIKASI
-- ============================================================================
CREATE POLICY "sertif_select" ON public.sertifikasi FOR SELECT USING (true);
CREATE POLICY "sertif_insert" ON public.sertifikasi FOR INSERT WITH CHECK (
    public.is_admin_or_operator() OR guru_id = public.get_user_guru_id()
);
CREATE POLICY "sertif_update" ON public.sertifikasi FOR UPDATE USING (
    public.is_admin_or_operator() OR guru_id = public.get_user_guru_id()
);
CREATE POLICY "sertif_delete" ON public.sertifikasi FOR DELETE USING (public.is_admin_or_operator());

-- ============================================================================
-- 7. POLICIES: JADWAL MENGAJAR & BEBAN MENGAJAR
-- ============================================================================
CREATE POLICY "jadwal_select" ON public.jadwal_mengajar FOR SELECT USING (true);
CREATE POLICY "jadwal_insert" ON public.jadwal_mengajar FOR INSERT WITH CHECK (public.is_admin_or_operator());
CREATE POLICY "jadwal_update" ON public.jadwal_mengajar FOR UPDATE USING (public.is_admin_or_operator());
CREATE POLICY "jadwal_delete" ON public.jadwal_mengajar FOR DELETE USING (public.is_admin_or_operator());

CREATE POLICY "beban_select" ON public.beban_mengajar FOR SELECT USING (true);
CREATE POLICY "beban_insert" ON public.beban_mengajar FOR INSERT WITH CHECK (public.is_admin_or_operator());
CREATE POLICY "beban_update" ON public.beban_mengajar FOR UPDATE USING (public.is_admin_or_operator());
CREATE POLICY "beban_delete" ON public.beban_mengajar FOR DELETE USING (public.is_admin_or_operator());

-- ============================================================================
-- 8. POLICIES: ABSENSI (PRESENSI)
-- ============================================================================
CREATE POLICY "absensi_select" ON public.absensi FOR SELECT USING (true);
CREATE POLICY "absensi_insert" ON public.absensi FOR INSERT WITH CHECK (
    public.is_admin_or_operator() OR guru_id = public.get_user_guru_id()
);
CREATE POLICY "absensi_update" ON public.absensi FOR UPDATE USING (
    public.is_admin_or_operator() OR guru_id = public.get_user_guru_id()
);
CREATE POLICY "absensi_delete" ON public.absensi FOR DELETE USING (public.is_admin_or_operator());

-- ============================================================================
-- 9. POLICIES: PKG (PENILAIAN KINERJA GURU)
-- ============================================================================
CREATE POLICY "pkg_select" ON public.pkg FOR SELECT USING (true);
CREATE POLICY "pkg_insert" ON public.pkg FOR INSERT WITH CHECK (public.is_admin_or_operator());
CREATE POLICY "pkg_update" ON public.pkg FOR UPDATE USING (public.is_admin_or_operator());
CREATE POLICY "pkg_delete" ON public.pkg FOR DELETE USING (public.is_admin_or_operator());

-- ============================================================================
-- 10. POLICIES: PRESTASI & PELATIHAN
-- ============================================================================
CREATE POLICY "prestasi_select" ON public.prestasi FOR SELECT USING (true);
CREATE POLICY "prestasi_insert" ON public.prestasi FOR INSERT WITH CHECK (
    public.is_admin_or_operator() OR guru_id = public.get_user_guru_id()
);
CREATE POLICY "prestasi_update" ON public.prestasi FOR UPDATE USING (
    public.is_admin_or_operator() OR guru_id = public.get_user_guru_id()
);
CREATE POLICY "prestasi_delete" ON public.prestasi FOR DELETE USING (public.is_admin_or_operator());

CREATE POLICY "pelatihan_select" ON public.pelatihan FOR SELECT USING (true);
CREATE POLICY "pelatihan_insert" ON public.pelatihan FOR INSERT WITH CHECK (
    public.is_admin_or_operator() OR guru_id = public.get_user_guru_id()
);
CREATE POLICY "pelatihan_update" ON public.pelatihan FOR UPDATE USING (
    public.is_admin_or_operator() OR guru_id = public.get_user_guru_id()
);
CREATE POLICY "pelatihan_delete" ON public.pelatihan FOR DELETE USING (public.is_admin_or_operator());

-- ============================================================================
-- 11. POLICIES: DOKUMEN
-- ============================================================================
CREATE POLICY "dokumen_select" ON public.dokumen FOR SELECT USING (true);
CREATE POLICY "dokumen_insert" ON public.dokumen FOR INSERT WITH CHECK (
    public.is_admin_or_operator() OR guru_id = public.get_user_guru_id()
);
CREATE POLICY "dokumen_update" ON public.dokumen FOR UPDATE USING (
    public.is_admin_or_operator() OR guru_id = public.get_user_guru_id()
);
CREATE POLICY "dokumen_delete" ON public.dokumen FOR DELETE USING (public.is_admin_or_operator());

-- ============================================================================
-- 12. POLICIES: AUDIT LOGS & PENGATURAN
-- ============================================================================
CREATE POLICY "audit_select" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT WITH CHECK (true); -- Izinkan trigger & system insert
CREATE POLICY "audit_delete" ON public.audit_logs FOR DELETE USING (public.is_admin());

CREATE POLICY "pengaturan_select" ON public.pengaturan_aplikasi FOR SELECT USING (true);
CREATE POLICY "pengaturan_insert" ON public.pengaturan_aplikasi FOR INSERT WITH CHECK (public.is_admin_or_operator());
CREATE POLICY "pengaturan_update" ON public.pengaturan_aplikasi FOR UPDATE USING (public.is_admin_or_operator());
CREATE POLICY "pengaturan_delete" ON public.pengaturan_aplikasi FOR DELETE USING (public.is_admin());

-- ============================================================================
-- REALTIME REPLICATION PUBLICATION
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.guru;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kepegawaian;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pendidikan;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sertifikasi;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jadwal_mengajar;
ALTER PUBLICATION supabase_realtime ADD TABLE public.beban_mengajar;
ALTER PUBLICATION supabase_realtime ADD TABLE public.absensi;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pkg;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prestasi;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pelatihan;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dokumen;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profil_sekolah;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pengaturan_aplikasi;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
