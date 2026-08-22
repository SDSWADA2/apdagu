/**
 * ============================================================================
 * ID CARD & QR CODE GENERATOR MODULE
 * APDAGU Enterprise v2.0
 * Cetak ID Card Guru Resmi 2 Sisi & Verifikasi QR Code
 * ============================================================================
 */

import { Store } from '../store/state.js';
import { Helpers } from '../utils/helpers.js';
import { ExportUtils } from '../utils/export_utils.js';

export const IDCardPage = {
  activeGuruId: null,

  init() {
    this.renderGuruList();
  },

  renderGuruList() {
    const listContainer = document.getElementById('idcard-guru-list');
    if (!listContainer) return;

    const guruList = Store.getAll('guru');
    listContainer.innerHTML = guruList.map(g => `
      <div class="list-group-item list-group-item-action d-flex align-items-center justify-content-between p-2" role="button" onclick="IDCardPage.previewCard('${g.id}')">
        <div class="d-flex align-items-center gap-2">
          <img src="${g.foto_url || Helpers.generateAvatarSvg(g.nama_lengkap)}" class="rounded-circle border" width="36" height="36" alt="">
          <div>
            <div class="fw-bold fs-7">${Helpers.formatNamaGelar(g)}</div>
            <small class="text-muted fs-8">${g.nip || g.nuptk || 'PTK'}</small>
          </div>
        </div>
        <button class="btn btn-sm btn-outline-primary" type="button"><i class="bi bi-person-badge"></i></button>
      </div>
    `).join('');

    if (guruList.length > 0) {
      this.previewCard(guruList[0].id);
    }
  },

  previewCard(guruId) {
    this.activeGuruId = guruId;
    const guru = Store.getById('guru', guruId);
    if (!guru) return;

    const kepeg = Store.getAll('kepegawaian').find(k => k.guru_id === guru.id) || {};
    const sekolah = Store.getSchoolProfile();

    const nameEl = document.getElementById('idcard-preview-nama');
    const nipEl = document.getElementById('idcard-preview-nip');
    const jabatanEl = document.getElementById('idcard-preview-jabatan');
    const fotoEl = document.getElementById('idcard-preview-foto');
    const qrContainer = document.getElementById('idcard-preview-qr');

    if (nameEl) nameEl.textContent = Helpers.formatNamaGelar(guru);
    if (nipEl) nipEl.textContent = `NIP. ${guru.nip || '-'}`;
    if (jabatanEl) jabatanEl.textContent = kepeg.jabatan || 'Guru Kelas';
    if (fotoEl) fotoEl.src = guru.foto_url || Helpers.generateAvatarSvg(guru.nama_lengkap);

    // Render QR Code via QRCode.js CDN
    if (qrContainer) {
      qrContainer.innerHTML = '';
      if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, {
          text: `https://cjijssmdrmzufacisrjn.supabase.co/verify-guru?id=${guru.id}`,
          width: 72,
          height: 72,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      }
    }
  },

  printIDCard() {
    if (!this.activeGuruId) return;
    const guru = Store.getById('guru', this.activeGuruId);
    if (!guru) return;

    const kepeg = Store.getAll('kepegawaian').find(k => k.guru_id === guru.id) || {};
    const sekolah = Store.getSchoolProfile();

    const html = `
      <div class="print-idcard-only">
        <!-- Sisi Depan -->
        <div class="id-card">
          <div class="id-card-header">
            <div class="id-card-logo-ring"><i class="bi bi-mortarboard-fill"></i></div>
            <div class="school-name">${sekolah.nama_sekolah || 'SD NEGERI SUMBER WARU 2'}</div>
            <div class="card-subtitle">KARTU IDENTITAS GURU &amp; PTK</div>
          </div>
          <div class="id-card-body-front">
            <div class="id-card-photo-wrapper">
              <img src="${guru.foto_url || Helpers.generateAvatarSvg(guru.nama_lengkap)}" class="id-card-photo" alt="">
            </div>
            <div class="id-card-guru-name">${Helpers.formatNamaGelar(guru)}</div>
            <div class="id-card-guru-role">${kepeg.jabatan || 'Guru Kelas'}</div>
            <table class="id-card-details-table">
              <tr><td class="label">NIP</td><td class="colon">:</td><td class="value">${guru.nip || '-'}</td></tr>
              <tr><td class="label">NUPTK</td><td class="colon">:</td><td class="value">${guru.nuptk || '-'}</td></tr>
              <tr><td class="label">Status</td><td class="colon">:</td><td class="value">${kepeg.status_kepegawaian || 'PNS'}</td></tr>
              <tr><td class="label">Unit Kerja</td><td class="colon">:</td><td class="value">${sekolah.nama_sekolah || 'SDN Sumber Waru 2'}</td></tr>
            </table>
          </div>
          <div class="id-card-validity">BERLAKU HINGGA: JUNI 2029</div>
          <div class="id-card-footer">
            <div class="id-card-barcode-box">
              <div class="id-card-barcode-lines"></div>
              <div class="id-card-barcode-text">${guru.nip || guru.nuptk || guru.id.slice(0, 12)}</div>
            </div>
          </div>
        </div>

        <!-- Sisi Belakang -->
        <div class="id-card id-card-back">
          <div class="id-card-back-header">
            <h6>KETENTUAN PENGGUNAAN KARTU</h6>
          </div>
          <div class="id-card-back-body">
            <ol class="id-card-terms">
              <li>Kartu ini adalah identitas resmi Tenaga Pendidik SD Negeri Sumber Waru 2.</li>
              <li>Wajib dibawa dan digunakan saat melaksanakan tugas dinas pendidikan.</li>
              <li>Bila kartu ini hilang, harap segera melapor ke pihak tata usaha sekolah.</li>
              <li>Dilarang memindahtangankan kartu kepada pihak lain.</li>
            </ol>
            <div class="id-card-back-sign">
              <div class="sign-date">Pamekasan, ${Helpers.formatDate(new Date())}</div>
              <div class="sign-title">Kepala Sekolah,</div>
              <div class="sign-img-placeholder"></div>
              <div class="sign-name">${sekolah.nama_kepala_sekolah || 'FAUZAN, S.Pd.SD.'}</div>
              <div class="sign-nip">NIP. ${sekolah.nip_kepala_sekolah || '19720602 199605 1 001'}</div>
            </div>
          </div>
          <div class="id-card-back-footer">
            KABUPATEN PAMEKASAN &bull; JAWA TIMUR
          </div>
        </div>
      </div>
    `;

    ExportUtils.printA4(html, `ID_Card_${guru.nama_lengkap}`);
  }
};
