/**
 * ============================================================================
 * PENGATURAN & BACKUP / RESTORE PAGE MODULE
 * APDAGU Enterprise v2.0
 * Profil Sekolah, Konfigurasi Jam Kerja, Dark Mode, Backup JSON, Restore
 * ============================================================================
 */

import { Store } from '../store/state.js';
import { Storage } from '../services/storage.js';
import { Theme } from '../utils/theme.js';
import { Toast } from '../utils/toast.js';
import { CONFIG } from '../app/config.js';

export const PengaturanPage = {
  init() {
    this.renderProfilSekolah();
    this.renderSettings();
  },

  renderProfilSekolah() {
    const s = Store.getSchoolProfile();
    const setField = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setField('sekolah-nama', s.nama_sekolah || CONFIG.SEKOLAH.NAMA);
    setField('sekolah-npsn', s.npsn || CONFIG.SEKOLAH.NPSN);
    setField('sekolah-nss', s.nss || CONFIG.SEKOLAH.NSS);
    setField('sekolah-akreditasi', s.akreditasi || 'A');
    setField('sekolah-alamat', s.alamat_lengkap || CONFIG.SEKOLAH.ALAMAT);
    setField('sekolah-telepon', s.telepon || '0819-5381-2155');
    setField('sekolah-email', s.email || 'sdnegerisumberwaru2@gmail.com');
    setField('sekolah-kepala', s.nama_kepala_sekolah || CONFIG.SEKOLAH.KEPALA_SEKOLAH);
    setField('sekolah-nip-kepala', s.nip_kepala_sekolah || CONFIG.SEKOLAH.NIP_KEPALA_SEKOLAH);

    const logoPreview = document.getElementById('sekolah-logo-preview');
    if (logoPreview && s.logo_url) {
      logoPreview.src = s.logo_url;
    }

    const fileInput = document.getElementById('sekolah-logo-file');
    if (fileInput) {
      // Hapus listener lama sebelum tambah baru agar tidak terduplikasi
      const newInput = fileInput.cloneNode(true);
      fileInput.parentNode.replaceChild(newInput, fileInput);
      newInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && logoPreview) {
          const reader = new FileReader();
          reader.onload = (ev) => { logoPreview.src = ev.target.result; };
          reader.readAsDataURL(file);
        }
      });
    }
  },

  renderSettings() {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    setVal('setting-tahun-ajaran', Store.getSetting('tahun_ajaran_aktif', '2026/2027'));
    setVal('setting-semester', Store.getSetting('semester_aktif', 'Ganjil'));
    setVal('setting-jam-masuk', Store.getSetting('jam_masuk_kerja', '07:00'));
    setVal('setting-jam-pulang', Store.getSetting('jam_pulang_kerja', '13:30'));
    setVal('setting-radius-absen', Store.getSetting('radius_absen_meter', '200'));
  },

  async saveProfilSekolah(formEl) {
    const formData = new FormData(formEl);
    const logoFile = document.getElementById('sekolah-logo-file')?.files?.[0];
    let logo_url = null;

    if (logoFile) {
      try {
        const uploadRes = await Storage.uploadFile('logo', logoFile);
        logo_url = uploadRes.url;
      } catch (e) {
        Toast.warning('Logo Gagal Diunggah', e.message);
      }
    }

    const payload = {
      nama_sekolah: formData.get('nama_sekolah'),
      npsn: formData.get('npsn'),
      nss: formData.get('nss'),
      akreditasi: formData.get('akreditasi'),
      alamat_lengkap: formData.get('alamat_lengkap'),
      telepon: formData.get('telepon'),
      email: formData.get('email'),
      nama_kepala_sekolah: formData.get('nama_kepala_sekolah'),
      nip_kepala_sekolah: formData.get('nip_kepala_sekolah')
    };

    if (logo_url) payload.logo_url = logo_url;

    try {
      const existing = Store.getSchoolProfile();
      if (existing?.id) payload.id = existing.id;

      if (existing?.id) {
        await Store.update('profil_sekolah', payload);
      } else {
        await Store.insert('profil_sekolah', payload);
      }
      Toast.success('Berhasil', 'Profil sekolah berhasil disimpan.');
    } catch (e) {
      Toast.error('Gagal', e.message);
    }
  },

  async saveSettings(formEl) {
    const formData = new FormData(formEl);
    try {
      // FIX: await semua updateSetting karena async
      await Store.updateSetting('tahun_ajaran_aktif', formData.get('tahun_ajaran_aktif'));
      await Store.updateSetting('semester_aktif', formData.get('semester_aktif'));
      await Store.updateSetting('jam_masuk_kerja', formData.get('jam_masuk_kerja'));
      await Store.updateSetting('jam_pulang_kerja', formData.get('jam_pulang_kerja'));
      await Store.updateSetting('radius_absen_meter', formData.get('radius_absen_meter'));

      Toast.success('Berhasil', 'Pengaturan sistem berhasil disimpan.');
    } catch (e) {
      Toast.error('Gagal', e.message);
    }
  },

  // ==========================================
  // BACKUP & RESTORE
  // ==========================================
  exportBackupJSON() {
    const fullBackup = {
      app: 'APDAGU Enterprise',
      version: '2.0.0',
      exported_at: new Date().toISOString(),
      sekolah: CONFIG.SEKOLAH.NAMA,
      data: {}
    };

    CONFIG.COLLECTIONS.forEach(col => {
      fullBackup.data[col] = Store.getAll(col);
    });

    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `APDAGU_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.success('Backup Selesai', 'File JSON database berhasil diunduh.');
  },

  async restoreFromJSON(fileInput) {
    const file = fileInput.files?.[0];
    if (!file) return;

    if (!confirm('Apakah Anda yakin ingin memulihkan database dari file backup ini? Data saat ini akan digabungkan.')) {
      return;
    }

    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      if (!backup.data) throw new Error('Format file backup tidak valid.');

      let count = 0;
      for (const col of Object.keys(backup.data)) {
        if (Array.isArray(backup.data[col])) {
          for (const item of backup.data[col]) {
            // Hanya insert jika ID belum ada
            if (item.id && !Store.getById(col, item.id)) {
              await Store.insert(col, item);
              count++;
            }
          }
        }
      }

      Toast.success('Restore Berhasil', `${count} data berhasil dipulihkan dari file backup.`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      Toast.error('Restore Gagal', e.message);
    }
  }
};
