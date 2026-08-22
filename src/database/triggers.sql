-- ============================================================================
-- APDAGU ENTERPRISE v2.0 — SUPABASE POSTGRESQL TRIGGERS
-- SD NEGERI SUMBER WARU 2 (KABUPATEN PAMEKASAN)
-- ============================================================================

-- ============================================================================
-- 1. FUNGSI & TRIGGER: UPDATE TIMESTAMP OTOMATIS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pasang Trigger update_timestamp ke Semua Tabel
DROP TRIGGER IF EXISTS trg_profil_sekolah_updated ON public.profil_sekolah;
CREATE TRIGGER trg_profil_sekolah_updated BEFORE UPDATE ON public.profil_sekolah FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_guru_updated ON public.guru;
CREATE TRIGGER trg_guru_updated BEFORE UPDATE ON public.guru FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_kepegawaian_updated ON public.kepegawaian;
CREATE TRIGGER trg_kepegawaian_updated BEFORE UPDATE ON public.kepegawaian FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_pendidikan_updated ON public.pendidikan;
CREATE TRIGGER trg_pendidikan_updated BEFORE UPDATE ON public.pendidikan FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_sertifikasi_updated ON public.sertifikasi;
CREATE TRIGGER trg_sertifikasi_updated BEFORE UPDATE ON public.sertifikasi FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_jadwal_updated ON public.jadwal_mengajar;
CREATE TRIGGER trg_jadwal_updated BEFORE UPDATE ON public.jadwal_mengajar FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_beban_updated ON public.beban_mengajar;
CREATE TRIGGER trg_beban_updated BEFORE UPDATE ON public.beban_mengajar FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_absensi_updated ON public.absensi;
CREATE TRIGGER trg_absensi_updated BEFORE UPDATE ON public.absensi FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_pkg_updated ON public.pkg;
CREATE TRIGGER trg_pkg_updated BEFORE UPDATE ON public.pkg FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_prestasi_updated ON public.prestasi;
CREATE TRIGGER trg_prestasi_updated BEFORE UPDATE ON public.prestasi FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_pelatihan_updated ON public.pelatihan;
CREATE TRIGGER trg_pelatihan_updated BEFORE UPDATE ON public.pelatihan FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_dokumen_updated ON public.dokumen;
CREATE TRIGGER trg_dokumen_updated BEFORE UPDATE ON public.dokumen FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_pengaturan_updated ON public.pengaturan_aplikasi;
CREATE TRIGGER trg_pengaturan_updated BEFORE UPDATE ON public.pengaturan_aplikasi FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- ============================================================================
-- 2. FUNGSI & TRIGGER: AUDIT LOGS OTOMATIS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    current_uid UUID;
    current_user_name TEXT := 'Sistem / Anonim';
    current_user_role TEXT := 'guru';
    rec_id UUID;
    old_row JSONB := NULL;
    new_row JSONB := NULL;
    desc_text TEXT;
BEGIN
    current_uid := auth.uid();
    
    IF current_uid IS NOT NULL THEN
        SELECT nama_lengkap, role INTO current_user_name, current_user_role 
        FROM public.profiles WHERE id = current_uid;
        IF current_user_name IS NULL THEN
            current_user_name := 'User ' || SUBSTRING(current_uid::TEXT FROM 1 FOR 8);
        END IF;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        rec_id := OLD.id;
        old_row := to_jsonb(OLD);
        desc_text := 'Menghapus data di tabel ' || TG_TABLE_NAME;
    ELSIF (TG_OP = 'UPDATE') THEN
        rec_id := NEW.id;
        old_row := to_jsonb(OLD);
        new_row := to_jsonb(NEW);
        desc_text := 'Memperbarui data di tabel ' || TG_TABLE_NAME;
    ELSIF (TG_OP = 'INSERT') THEN
        rec_id := NEW.id;
        new_row := to_jsonb(NEW);
        desc_text := 'Menambahkan data baru di tabel ' || TG_TABLE_NAME;
    END IF;

    INSERT INTO public.audit_logs (
        user_id,
        username,
        role,
        aksi,
        tabel_terkait,
        record_id,
        data_lama,
        data_baru,
        deskripsi,
        created_at
    ) VALUES (
        current_uid,
        COALESCE(current_user_name, 'Sistem'),
        COALESCE(current_user_role, 'guru'),
        TG_OP,
        TG_TABLE_NAME,
        rec_id,
        old_row,
        new_row,
        desc_text,
        TIMEZONE('utc', NOW())
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pasang Audit Log Trigger ke Tabel Penting
DROP TRIGGER IF EXISTS audit_guru ON public.guru;
CREATE TRIGGER audit_guru AFTER INSERT OR UPDATE OR DELETE ON public.guru FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS audit_kepegawaian ON public.kepegawaian;
CREATE TRIGGER audit_kepegawaian AFTER INSERT OR UPDATE OR DELETE ON public.kepegawaian FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS audit_pendidikan ON public.pendidikan;
CREATE TRIGGER audit_pendidikan AFTER INSERT OR UPDATE OR DELETE ON public.pendidikan FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS audit_sertifikasi ON public.sertifikasi;
CREATE TRIGGER audit_sertifikasi AFTER INSERT OR UPDATE OR DELETE ON public.sertifikasi FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS audit_jadwal ON public.jadwal_mengajar;
CREATE TRIGGER audit_jadwal AFTER INSERT OR UPDATE OR DELETE ON public.jadwal_mengajar FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS audit_beban ON public.beban_mengajar;
CREATE TRIGGER audit_beban AFTER INSERT OR UPDATE OR DELETE ON public.beban_mengajar FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS audit_absensi ON public.absensi;
CREATE TRIGGER audit_absensi AFTER INSERT OR UPDATE OR DELETE ON public.absensi FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS audit_pkg ON public.pkg;
CREATE TRIGGER audit_pkg AFTER INSERT OR UPDATE OR DELETE ON public.pkg FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS audit_prestasi ON public.prestasi;
CREATE TRIGGER audit_prestasi AFTER INSERT OR UPDATE OR DELETE ON public.prestasi FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS audit_pelatihan ON public.pelatihan;
CREATE TRIGGER audit_pelatihan AFTER INSERT OR UPDATE OR DELETE ON public.pelatihan FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS audit_dokumen ON public.dokumen;
CREATE TRIGGER audit_dokumen AFTER INSERT OR UPDATE OR DELETE ON public.dokumen FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- ============================================================================
-- 3. FUNGSI & TRIGGER: PROFIL OTOMATIS DARI AUTH.USERS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, nama_lengkap, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'guru')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        nama_lengkap = COALESCE(EXCLUDED.nama_lengkap, profiles.nama_lengkap),
        role = COALESCE(EXCLUDED.role, profiles.role);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
