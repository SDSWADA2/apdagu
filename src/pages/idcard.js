/**
 * ============================================================================
 * ID CARD & QR CODE GENERATOR MODULE
 * APDAGU Enterprise v2.0
 * Cetak ID Card Guru Resmi & Verifikasi QR Code
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
      <div class="list-group-item list-group-item-action d-flex align-items-center justify-content-between p-2" onclick="IDCardPage.previewCard('${g.id}')">
        <div class="d-flex align-items-center gap-2">
          <img src="${g.foto_url || Helpers.generateAvatarSvg(g.nama_lengkap)}" class="rounded-circle border" width="36" height="36">
          <div>
            <div class="fw-bold fs-7">${Helpers.formatNamaGelar(g)}</div>
            <small class="text-muted fs-8">${g.nip || g.nuptk || 'PTK'}</small>
          </div>
        </div>
        <button class="btn btn-sm btn-outline-primary"><i class="bi bi-person-badge"></i></button>
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
    if (jabatanEl) jabatanEl.textContent = kepeg.jabatan || 'Guru';
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
    const cardEl = document.getElementById('idcard-printable-wrap');
    if (!cardEl) return;
    ExportUtils.printA4(cardEl.innerHTML, 'ID_Card_Guru');
  }
};
