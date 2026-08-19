/**
 * ============================================================================
 * MODUL PENILAIAN KINERJA GURU (PKG / SKP) (DISEMPURNAKAN)
 * SD NEGERI SUMBER WARU 2
 * ============================================================================
 */

const PKGModule = {
  filterTahun: 'all',

  init() {
    this.bindEvents();
    this.renderGuruSelect();
    this.renderList();
  },

  bindEvents() {
    const form = document.getElementById('form-pkg');
    if (form) {
      // Auto-calculate final score on input
      ['form-pkg-perencanaan', 'form-pkg-pelaksanaan', 'form-pkg-evaluasi', 'form-pkg-profesional', 'form-pkg-kehadiran'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
          input.addEventListener('input', () => this.calculateFinalScore());
        }
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.savePKG();
      });
    }
  },

  renderGuruSelect() {
    const formSelect = document.getElementById('form-pkg-guru-id');
    if (!formSelect) return;
    const guruList = DB.getAll('guru').filter(g => g.status_keaktifan === 'Aktif');
    formSelect.innerHTML = `<option value="">-- Pilih Guru Dinilai --</option>` + 
      guruList.map(g => `<option value="${g.id}">${Helpers.formatNamaGelar(g)} (${g.nip || g.nuptk || 'NIP -'})</option>`).join('');
  },

  calculateFinalScore() {
    const p = parseFloat(document.getElementById('form-pkg-perencanaan').value) || 0;
    const l = parseFloat(document.getElementById('form-pkg-pelaksanaan').value) || 0;
    const e = parseFloat(document.getElementById('form-pkg-evaluasi').value) || 0;
    const pr = parseFloat(document.getElementById('form-pkg-profesional').value) || 0;
    const k = parseFloat(document.getElementById('form-pkg-kehadiran').value) || 0;

    // Bobot: 20% Perencanaan, 30% Pelaksanaan, 20% Evaluasi, 15% Profesional, 15% Kehadiran
    const finalScore = (p * 0.20) + (l * 0.30) + (e * 0.20) + (pr * 0.15) + (k * 0.15);
    const predikatInfo = Helpers.getPredikatPKG(finalScore);

    const scoreDisplay = document.getElementById('form-pkg-nilai-akhir');
    const predikatDisplay = document.getElementById('form-pkg-predikat');

    if (scoreDisplay) scoreDisplay.value = finalScore.toFixed(1);
    if (predikatDisplay) predikatDisplay.value = predikatInfo.predikat;
  },

  renderList() {
    const tbody = document.getElementById('pkg-table-body');
    if (!tbody) return;

    let list = DB.getAll('pkg');
    if (this.filterTahun !== 'all') {
      list = list.filter(p => p.tahun_penilaian == this.filterTahun);
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">Belum ada data penilaian kinerja guru.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((p, idx) => {
      const guru = DB.getById('guru', p.guru_id) || {};
      const predikatInfo = Helpers.getPredikatPKG(p.nilai_akhir);

      return `
        <tr>
          <td class="text-center fw-bold text-muted">${idx + 1}</td>
          <td>
            <div class="fw-bold text-dark">${Helpers.formatNamaGelar(guru)}</div>
            <small class="text-muted">Tahun: <strong>${p.tahun_penilaian}</strong> | NIP: ${guru.nip || '-'}</small>
          </td>
          <td class="text-center">${p.skor_perencanaan}</td>
          <td class="text-center">${p.skor_pelaksanaan}</td>
          <td class="text-center">${p.skor_evaluasi}</td>
          <td class="text-center">${p.skor_profesionalisme}</td>
          <td class="text-center"><strong class="fs-6 text-primary">${p.nilai_akhir}</strong></td>
          <td class="text-center">
            <span class="badge ${predikatInfo.badge}">
              ${p.predikat} (${predikatInfo.persentase})
            </span>
          </td>
          <td class="text-center">
            <div class="d-flex gap-1 justify-content-center">
              <button class="btn btn-sm btn-outline-dark p-1" onclick="PKGModule.printPKG(${p.id})" title="Cetak Lembar PKG"><i class="bi bi-printer"></i></button>
              <button class="btn btn-sm btn-outline-warning p-1" onclick="PKGModule.openEditModal(${p.id})" title="Edit"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-outline-danger p-1" onclick="PKGModule.deletePKG(${p.id})" title="Hapus"><i class="bi bi-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    const form = document.getElementById('form-pkg');
    if (!form) return;
    form.reset();
    document.getElementById('form-pkg-id').value = '';
    document.getElementById('form-pkg-tahun').value = new Date().getFullYear();
    document.getElementById('form-pkg-penilai').value = 'Drs. H. Bambang Sutrisno, M.Pd.';
    document.getElementById('form-pkg-perencanaan').value = 90;
    document.getElementById('form-pkg-pelaksanaan').value = 88;
    document.getElementById('form-pkg-evaluasi').value = 89;
    document.getElementById('form-pkg-profesional').value = 91;
    document.getElementById('form-pkg-kehadiran').value = 95;
    this.calculateFinalScore();
    document.getElementById('modal-pkg-title').textContent = 'Input Penilaian Kinerja Guru (PKG)';
    this.renderGuruSelect();

    const modal = new bootstrap.Modal(document.getElementById('modal-pkg-form'));
    modal.show();
  },

  openEditModal(id) {
    const item = DB.getById('pkg', id);
    if (!item) return;

    this.renderGuruSelect();
    document.getElementById('modal-pkg-title').textContent = 'Edit Penilaian Kinerja Guru (PKG)';
    document.getElementById('form-pkg-id').value = item.id;
    document.getElementById('form-pkg-guru-id').value = item.guru_id;
    document.getElementById('form-pkg-tahun').value = item.tahun_penilaian;
    document.getElementById('form-pkg-perencanaan').value = item.skor_perencanaan;
    document.getElementById('form-pkg-pelaksanaan').value = item.skor_pelaksanaan;
    document.getElementById('form-pkg-evaluasi').value = item.skor_evaluasi;
    document.getElementById('form-pkg-profesional').value = item.skor_profesionalisme;
    document.getElementById('form-pkg-kehadiran').value = item.skor_kehadiran;
    document.getElementById('form-pkg-penilai').value = item.nama_penilai || 'Drs. H. Bambang Sutrisno, M.Pd.';
    document.getElementById('form-pkg-catatan').value = item.catatan_rekomendasi || '';
    this.calculateFinalScore();

    const modal = new bootstrap.Modal(document.getElementById('modal-pkg-form'));
    modal.show();
  },

  savePKG() {
    const id = document.getElementById('form-pkg-id').value;
    const guruId = parseInt(document.getElementById('form-pkg-guru-id').value);
    if (!guruId) {
      App.showToast('Peringatan', 'Pilih guru yang dinilai!', 'warning');
      return;
    }

    const p = parseFloat(document.getElementById('form-pkg-perencanaan').value) || 85;
    const l = parseFloat(document.getElementById('form-pkg-pelaksanaan').value) || 85;
    const e = parseFloat(document.getElementById('form-pkg-evaluasi').value) || 85;
    const pr = parseFloat(document.getElementById('form-pkg-profesional').value) || 85;
    const k = parseFloat(document.getElementById('form-pkg-kehadiran').value) || 85;
    const finalScore = (p * 0.20) + (l * 0.30) + (e * 0.20) + (pr * 0.15) + (k * 0.15);
    const predikatInfo = Helpers.getPredikatPKG(finalScore);

    const data = {
      guru_id: guruId,
      tahun_penilaian: parseInt(document.getElementById('form-pkg-tahun').value) || 2026,
      periode: 'Tahunan',
      skor_perencanaan: p,
      skor_pelaksanaan: l,
      skor_evaluasi: e,
      skor_profesionalisme: pr,
      skor_kehadiran: k,
      nilai_akhir: parseFloat(finalScore.toFixed(1)),
      predikat: predikatInfo.predikat,
      nama_penilai: document.getElementById('form-pkg-penilai').value.trim() || 'Kepala Sekolah',
      catatan_rekomendasi: document.getElementById('form-pkg-catatan').value.trim()
    };

    const guru = DB.getById('guru', guruId);
    const namaGuru = guru ? Helpers.formatNamaGelar(guru) : '';

    if (!id) {
      DB.insert('pkg', data, `Input nilai PKG (${data.nilai_akhir} - ${data.predikat}) untuk ${namaGuru}`);
      App.showToast('Sukses', `Penilaian Kinerja Guru untuk ${namaGuru} berhasil disimpan.`, 'success');
    } else {
      DB.update('pkg', id, data, `Update nilai PKG untuk ${namaGuru}`);
      App.showToast('Sukses', `Penilaian Kinerja Guru untuk ${namaGuru} berhasil diperbarui.`, 'success');
    }

    const modalEl = document.getElementById('modal-pkg-form');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    this.renderList();
  },

  deletePKG(id) {
    App.showConfirm('Hapus Penilaian', 'Hapus penilaian kinerja ini?', () => {
      DB.delete('pkg', id, 'Menghapus penilaian kinerja PKG');
      this.renderList();
      App.showToast('Dihapus', 'Data penilaian PKG telah dihapus.', 'info');
    });
  },

  printPKG(id) {
    const p = DB.getById('pkg', id);
    if (!p) return;
    const guru = DB.getById('guru', p.guru_id) || {};
    const kep = DB.getAll('kepegawaian').find(k => k.guru_id === guru.id) || {};
    const profil = DB.state.profil_sekolah || {};
    const predikatInfo = Helpers.getPredikatPKG(p.nilai_akhir);

    const printContainer = document.getElementById('print-a4-container');
    if (!printContainer) return;

    printContainer.innerHTML = `
      ${App.getKopSuratLaporan()}

      <div class="text-center my-3">
        <h4 style="text-decoration: underline; font-weight: bold; margin-bottom: 2px;">LEMBAR HASIL PENILAIAN KINERJA GURU (PKG / SKP)</h4>
        <small>Periode Penilaian: Tahun ${p.tahun_penilaian}</small>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10pt;">
        <tr><td style="width: 25%; padding: 4px;">Nama Guru Dinilai</td><td style="width: 3%;">:</td><td><strong>${Helpers.formatNamaGelar(guru)}</strong></td></tr>
        <tr><td style="padding: 4px;">NIP / NUPTK</td><td>:</td><td>${guru.nip || '-'} / ${guru.nuptk || '-'}</td></tr>
        <tr><td style="padding: 4px;">Pangkat / Golongan</td><td>:</td><td>${kep.pangkat_golongan || '-'}</td></tr>
        <tr><td style="padding: 4px;">Jabatan / Tugas</td><td>:</td><td>${kep.jabatan || 'Guru Kelas SD'}</td></tr>
        <tr><td style="padding: 4px;">Nama Pejabat Penilai</td><td>:</td><td><strong>${p.nama_penilai || profil.nama_kepala_sekolah}</strong></td></tr>
      </table>

      <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 10pt;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">No</th>
            <th style="border: 1px solid #000; padding: 6px;">Komponen Penilaian Kinerja</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">Bobot</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">Skor (0-100)</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">Skor Tertimbang</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #000; text-align: center; padding: 6px;">1</td>
            <td style="border: 1px solid #000; padding: 6px;">Perencanaan Pembelajaran & Asesmen (Modul Ajar)</td>
            <td style="border: 1px solid #000; text-align: center; padding: 6px;">20%</td>
            <td style="border: 1px solid #000; text-align: center; padding: 6px;">${p.skor_perencanaan}</td>
            <td style="border: 1px solid #000; text-align: center; padding: 6px; font-weight: bold;">${(p.skor_perencanaan * 0.2).toFixed(1)}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; text-align: center; padding: 6px;">2</td>
            <td style="border: 1px solid #000; padding: 6px;">Pelaksanaan Pembelajaran Berdiferensiasi & Interaktif</td>
            <td style="border: 1px solid #000; text-align: center; padding: 6px;">30%</td>
            <td style="border: 1px solid #000; text-align: center; padding: 6px;">${p.skor_pelaksanaan}</td>
            <td style="border: 1px solid #000; text-align: center; padding: 6px; font-weight: bold;">${(p.skor_pelaksanaan * 0.3).toFixed(1)}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; text-align: center; padding: 6px;">3</td>
            <td style="border: 1px solid #000; padding: 6px;">Evaluasi, Asesmen & Refleksi Pembelajaran</td>
            <td style="border: 1px solid #000; text-align: center; padding: 6px;">20%</td>
            <td style="border: 1px solid #000; text-align: center; padding: 6px;">${p.skor_evaluasi}</td>
            <td style="border: 1px solid #000; text-align: center; padding: 6px; font-weight: bold;">${(p.skor_evaluasi * 0.2).toFixed(1)}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; text-align: center; padding: 6px;">4</td>
            <td style="border: 1px solid #000; padding: 6px;">Pengembangan Keprofesian & Aksi Nyata PMM</td>
            <td style="border: 1px solid #000; text-align: center; padding: 6px;">15%</td>
            <td style="border: 1px solid #000; text-align: center; padding: 6px;">${p.skor_profesionalisme}</td>
            <td style="border: 1px solid #000; text-align: center; padding: 6px; font-weight: bold;">${(p.skor_profesionalisme * 0.15).toFixed(1)}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; text-align: center; padding: 6px;">5</td>
            <td style="border: 1px solid #000; padding: 6px;">Kedisiplinan & Presensi Kehadiran Riil</td>
            <td style="border: 1px solid #000; text-align: center; padding: 6px;">15%</td>
            <td style="border: 1px solid #000; text-align: center; padding: 6px;">${p.skor_kehadiran}</td>
            <td style="border: 1px solid #000; text-align: center; padding: 6px; font-weight: bold;">${(p.skor_kehadiran * 0.15).toFixed(1)}</td>
          </tr>
          <tr style="background: #f8fafc; font-weight: bold;">
            <td colspan="4" style="border: 1px solid #000; text-align: right; padding: 8px;">NILAI AKHIR KINERJA:</td>
            <td style="border: 1px solid #000; text-align: center; padding: 8px; font-size: 11pt; color: #2563eb;">${p.nilai_akhir}</td>
          </tr>
          <tr style="background: #f8fafc; font-weight: bold;">
            <td colspan="4" style="border: 1px solid #000; text-align: right; padding: 8px;">PREDIKAT KINERJA & KONVERSI ANGKA KREDIT:</td>
            <td style="border: 1px solid #000; text-align: center; padding: 8px; font-size: 11pt; color: green;">${p.predikat} (${predikatInfo.persentase})</td>
          </tr>
        </tbody>
      </table>

      <div style="border: 1px solid #94a3b8; padding: 10px; border-radius: 4px; margin-top: 10px;">
        <strong>Catatan & Rekomendasi Pejabat Penilai:</strong>
        <p style="margin: 5px 0 0 0; font-style: italic;">"${p.catatan_rekomendasi || 'Pertahankan dan tingkatkan kualitas pembelajaran berpusat pada peserta didik.'}"</p>
      </div>

      <div style="display: flex; justify-content: space-between; margin-top: 30px; page-break-inside: avoid;">
        <div style="text-align: center; width: 220px; font-size: 9.5pt;">
          <p style="margin-bottom: 50px;">Guru Yang Dinilai,</p>
          <p style="font-weight: bold; text-decoration: underline; margin-bottom: 0;">${Helpers.formatNamaGelar(guru)}</p>
          <small>NIP. ${guru.nip || '-'}</small>
        </div>
        ${App.getTandaTanganKS(`31 Desember ${p.tahun_penilaian}`)}
      </div>
    `;

    window.print();
  },

  exportExcel() {
    LaporanModule.exportPKGExcel();
  }
};
