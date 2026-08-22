/**
 * ============================================================================
 * PROFIL GURU DETAIL PAGE MODULE (10 TABS)
 * APDAGU Enterprise v2.0
 * Biodata, Kepegawaian, Pendidikan, Sertifikasi, Jadwal, Absensi, PKG, Pelatihan, Dokumen, Riwayat
 * ============================================================================
 */

import { Store } from '../store/state.js';
import { Helpers } from '../utils/helpers.js';
import { ExportUtils } from '../utils/export_utils.js';

export const ProfilGuruPage = {
  activeGuruId: null,

  init(guruId) {
    if (!guruId) {
      const firstGuru = Store.getAll('guru')[0];
      this.activeGuruId = firstGuru ? firstGuru.id : null;
    } else {
      this.activeGuruId = guruId;
    }
    this.render();
  },

  setGuru(guruId) {
    this.activeGuruId = guruId;
    this.render();
  },

  render() {
    if (!this.activeGuruId) return;
    const guru = Store.getById('guru', this.activeGuruId);
    if (!guru) return;

    // Header Profil
    const avatar = document.getElementById('profil-header-avatar');
    const nama = document.getElementById('profil-header-nama');
    const nuptk = document.getElementById('profil-header-nuptk');
    const status = document.getElementById('profil-header-status');

    if (avatar) avatar.src = guru.foto_url || Helpers.generateAvatarSvg(guru.nama_lengkap);
    if (nama) nama.textContent = Helpers.formatNamaGelar(guru);
    if (nuptk) nuptk.textContent = `NUPTK: ${guru.nuptk || '-'} | NIP: ${guru.nip || '-'}`;
    if (status) {
      status.className = `badge ${guru.status_keaktifan === 'Aktif' ? 'bg-success' : 'bg-secondary'}`;
      status.textContent = guru.status_keaktifan || 'Aktif';
    }

    // Render 10 Tabs
    this.renderBiodataTab(guru);
    this.renderKepegawaianTab(guru);
    this.renderPendidikanTab(guru);
    this.renderSertifikasiTab(guru);
    this.renderJadwalTab(guru);
    this.renderAbsensiTab(guru);
    this.renderPKGTab(guru);
    this.renderPelatihanTab(guru);
    this.renderDokumenTab(guru);
    this.renderAuditTab(guru);
  },

  renderBiodataTab(guru) {
    const el = document.getElementById('tab-biodata-content');
    if (!el) return;
    el.innerHTML = `
      <div class="row g-3 fs-7">
        <div class="col-md-6"><span class="text-muted d-block">Nama Lengkap:</span><strong>${guru.nama_lengkap}</strong></div>
        <div class="col-md-6"><span class="text-muted d-block">Gelar:</span><strong>${guru.gelar_depan || '-'} / ${guru.gelar_belakang || '-'}</strong></div>
        <div class="col-md-6"><span class="text-muted d-block">NUPTK:</span><strong>${guru.nuptk || '-'}</strong></div>
        <div class="col-md-6"><span class="text-muted d-block">NIP:</span><strong>${guru.nip || '-'}</strong></div>
        <div class="col-md-6"><span class="text-muted d-block">NIK (KTP):</span><strong>${guru.nik || '-'}</strong></div>
        <div class="col-md-6"><span class="text-muted d-block">No KK:</span><strong>${guru.no_kk || '-'}</strong></div>
        <div class="col-md-6"><span class="text-muted d-block">NPWP:</span><strong>${guru.npwp || '-'}</strong></div>
        <div class="col-md-6"><span class="text-muted d-block">Jenis Kelamin:</span><strong>${guru.jenis_kelamin}</strong></div>
        <div class="col-md-6"><span class="text-muted d-block">Tempat, Tanggal Lahir:</span><strong>${guru.tempat_lahir}, ${Helpers.formatDate(guru.tanggal_lahir)}</strong></div>
        <div class="col-md-6"><span class="text-muted d-block">Agama:</span><strong>${guru.agama}</strong></div>
        <div class="col-md-6"><span class="text-muted d-block">No Handphone / WA:</span><strong>${guru.no_hp}</strong></div>
        <div class="col-md-6"><span class="text-muted d-block">Email:</span><strong>${guru.email || '-'}</strong></div>
        <div class="col-12"><span class="text-muted d-block">Alamat Tempat Tinggal:</span><strong>${guru.alamat_jalan}, ${guru.desa_kelurahan}, ${guru.kecamatan}, ${guru.kabupaten_kota}, ${guru.provinsi} ${guru.kode_pos}</strong></div>
      </div>
    `;
  },

  renderKepegawaianTab(guru) {
    const el = document.getElementById('tab-kepegawaian-content');
    if (!el) return;
    const item = Store.getAll('kepegawaian').find(k => k.guru_id === guru.id);
    if (!item) {
      el.innerHTML = `<div class="p-3 text-muted text-center">Belum ada riwayat kepegawaian.</div>`;
      return;
    }
    el.innerHTML = `
      <div class="row g-3 fs-7">
        <div class="col-md-6"><span class="text-muted d-block">Status Kepegawaian:</span><span class="badge bg-primary fs-7">${item.status_kepegawaian}</span></div>
        <div class="col-md-6"><span class="text-muted d-block">Jabatan:</span><strong>${item.jabatan}</strong></div>
        <div class="col-md-6"><span class="text-muted d-block">Pangkat / Golongan:</span><strong>${item.pangkat_golongan || '-'}</strong></div>
        <div class="col-md-6"><span class="text-muted d-block">TMT Pengangkatan:</span><strong>${Helpers.formatDate(item.tmt_pengangkatan)}</strong></div>
        <div class="col-md-6"><span class="text-muted d-block">Nomor SK:</span><strong>${item.nomor_sk || '-'}</strong></div>
        <div class="col-md-6"><span class="text-muted d-block">Gaji Pokok:</span><strong>${Helpers.formatRupiah(item.gaji_pokok)}</strong></div>
      </div>
    `;
  },

  renderPendidikanTab(guru) {
    const el = document.getElementById('tab-pendidikan-content');
    if (!el) return;
    const items = Store.getAll('pendidikan').filter(p => p.guru_id === guru.id);
    if (items.length === 0) {
      el.innerHTML = `<div class="p-3 text-muted text-center">Belum ada riwayat pendidikan.</div>`;
      return;
    }
    el.innerHTML = items.map(p => `
      <div class="card mb-2 border p-3">
        <div class="d-flex justify-content-between align-items-center">
          <h6 class="mb-1 text-primary fw-bold">${p.jenjang} — ${p.program_studi}</h6>
          <span class="badge bg-light text-dark border">Lulus ${p.tahun_lulus}</span>
        </div>
        <div class="text-muted fs-7">${p.nama_institusi} &bull; IPK: <strong>${p.ipk || '-'}</strong></div>
        <small class="text-muted">No Ijazah: ${p.nomor_ijazah || '-'}</small>
      </div>
    `).join('');
  },

  renderSertifikasiTab(guru) {
    const el = document.getElementById('tab-sertifikasi-content');
    if (!el) return;
    const items = Store.getAll('sertifikasi').filter(s => s.guru_id === guru.id);
    if (items.length === 0) {
      el.innerHTML = `<div class="p-3 text-muted text-center">Belum ada sertifikasi pendidik.</div>`;
      return;
    }
    el.innerHTML = items.map(s => `
      <div class="card mb-2 border p-3">
        <div class="d-flex justify-content-between align-items-center">
          <h6 class="mb-1 text-success fw-bold"><i class="bi bi-patch-check-fill me-1"></i>${s.bidang_studi} (${s.tahun_sertifikasi})</h6>
          <span class="badge bg-success">${s.status_berlaku}</span>
        </div>
        <div class="fs-7 text-muted">LPTK: <strong>${s.lptk_penyelenggara}</strong></div>
        <small class="text-muted">No Sertifikat: ${s.nomor_sertifikat} | NRG: ${s.nomor_registrasi_guru || '-'}</small>
      </div>
    `).join('');
  },

  renderJadwalTab(guru) {
    const el = document.getElementById('tab-jadwal-content');
    if (!el) return;
    const items = Store.getAll('jadwal_mengajar').filter(j => j.guru_id === guru.id);
    if (items.length === 0) {
      el.innerHTML = `<div class="p-3 text-muted text-center">Belum ada jadwal mengajar.</div>`;
      return;
    }
    el.innerHTML = `
      <div class="table-responsive">
        <table class="table table-sm table-bordered">
          <thead class="table-light text-center">
            <tr><th>Hari</th><th>Jam</th><th>Kelas</th><th>Mata Pelajaran</th><th>JP</th></tr>
          </thead>
          <tbody>
            ${items.map(j => `
              <tr>
                <td class="fw-bold">${j.hari}</td>
                <td class="text-center">${j.waktu_mulai?.slice(0,5)} - ${j.waktu_selesai?.slice(0,5)}</td>
                <td class="text-center">${j.kelas}</td>
                <td>${j.mata_pelajaran}</td>
                <td class="text-center fw-bold">${j.jumlah_jp} JP</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderAbsensiTab(guru) {
    const el = document.getElementById('tab-absensi-content');
    if (!el) return;
    const items = Store.getAll('absensi').filter(a => a.guru_id === guru.id).slice(0, 15);
    if (items.length === 0) {
      el.innerHTML = `<div class="p-3 text-muted text-center">Belum ada data presensi.</div>`;
      return;
    }
    el.innerHTML = `
      <div class="table-responsive">
        <table class="table table-sm table-hover">
          <thead><tr><th>Tanggal</th><th>Status</th><th>Masuk</th><th>Pulang</th><th>Keterangan</th></tr></thead>
          <tbody>
            ${items.map(a => `
              <tr>
                <td>${Helpers.formatDate(a.tanggal)}</td>
                <td><span class="badge ${Helpers.getStatusKehadiranBadge(a.status_kehadiran)}">${a.status_kehadiran}</span></td>
                <td>${a.waktu_masuk ? Helpers.formatTime(a.waktu_masuk) : '-'}</td>
                <td>${a.waktu_pulang ? Helpers.formatTime(a.waktu_pulang) : '-'}</td>
                <td><small class="text-muted">${a.keterangan || '-'}</small></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderPKGTab(guru) {
    const el = document.getElementById('tab-pkg-content');
    if (!el) return;
    const items = Store.getAll('pkg').filter(p => p.guru_id === guru.id);
    if (items.length === 0) {
      el.innerHTML = `<div class="p-3 text-muted text-center">Belum ada data penilaian kinerja guru (PKG).</div>`;
      return;
    }
    el.innerHTML = items.map(p => `
      <div class="card mb-2 border p-3">
        <div class="d-flex justify-content-between align-items-center">
          <h6 class="mb-1 fw-bold">Tahun Penilaian: ${p.tahun_penilaian}</h6>
          <span class="badge ${Helpers.getPredikatPKG(p.nilai_akhir).badge}">${p.predikat} (${p.nilai_akhir})</span>
        </div>
        <div class="row g-2 mt-1 fs-8 text-muted">
          <div class="col-4">Perencanaan: <strong>${p.skor_perencanaan}</strong></div>
          <div class="col-4">Pelaksanaan: <strong>${p.skor_pelaksanaan}</strong></div>
          <div class="col-4">Evaluasi: <strong>${p.skor_evaluasi}</strong></div>
        </div>
        <div class="mt-2 fs-7 text-dark"><em>"${p.catatan_rekomendasi || 'Pertahankan dan tingkatkan kinerja.'}"</em></div>
      </div>
    `).join('');
  },

  renderPelatihanTab(guru) {
    const el = document.getElementById('tab-pelatihan-content');
    if (!el) return;
    const items = Store.getAll('pelatihan').filter(p => p.guru_id === guru.id);
    if (items.length === 0) {
      el.innerHTML = `<div class="p-3 text-muted text-center">Belum ada riwayat pelatihan / PMM.</div>`;
      return;
    }
    el.innerHTML = items.map(p => `
      <div class="card mb-2 border p-3">
        <div class="d-flex justify-content-between align-items-center">
          <h6 class="mb-1 fw-bold text-primary">${p.nama_pelatihan}</h6>
          <span class="badge bg-info text-dark">${p.pola_jp} JP</span>
        </div>
        <div class="text-muted fs-7">${p.jenis_pelatihan} &bull; Penyelenggara: <strong>${p.penyelenggara}</strong></div>
        <small class="text-muted">${Helpers.formatDate(p.tanggal_mulai)} s.d ${Helpers.formatDate(p.tanggal_selesai)}</small>
      </div>
    `).join('');
  },

  renderDokumenTab(guru) {
    const el = document.getElementById('tab-dokumen-content');
    if (!el) return;
    const items = Store.getAll('dokumen').filter(d => d.guru_id === guru.id);
    if (items.length === 0) {
      el.innerHTML = `<div class="p-3 text-muted text-center">Belum ada dokumen yang diunggah.</div>`;
      return;
    }
    el.innerHTML = items.map(d => `
      <div class="d-flex justify-content-between align-items-center p-2 border-bottom">
        <div>
          <span class="badge bg-light text-dark border me-1">${d.kategori_dokumen}</span>
          <strong>${d.nama_dokumen}</strong>
        </div>
        <a href="${d.file_url}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="bi bi-file-earmark-pdf me-1"></i>Buka</a>
      </div>
    `).join('');
  },

  renderAuditTab(guru) {
    const el = document.getElementById('tab-audit-content');
    if (!el) return;
    const items = Store.getAll('audit_logs').filter(a => a.record_id === guru.id || a.tabel_terkait === 'guru').slice(0, 10);
    if (items.length === 0) {
      el.innerHTML = `<div class="p-3 text-muted text-center">Belum ada riwayat aktivitas untuk guru ini.</div>`;
      return;
    }
    el.innerHTML = items.map(a => `
      <div class="p-2 border-bottom fs-7">
        <div class="d-flex justify-content-between">
          <strong>${a.username} (${a.role})</strong>
          <small class="text-muted">${Helpers.formatDate(a.created_at, true)}</small>
        </div>
        <div class="text-muted mt-1">${a.deskripsi} &bull; Aksi: <span class="badge bg-light text-dark border">${a.aksi}</span></div>
      </div>
    `).join('');
  }
};
