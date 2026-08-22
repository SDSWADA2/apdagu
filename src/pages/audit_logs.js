/**
 * ============================================================================
 * AUDIT LOGS & RIWAYAT AKTIVITAS PAGE MODULE
 * APDAGU Enterprise v2.0
 * Multi-user mutation audit logs, IP, Timestamp, Old/New diff
 * ============================================================================
 */

import { Store } from '../store/state.js';
import { Helpers } from '../utils/helpers.js';
import { ExportUtils } from '../utils/export_utils.js';

export const AuditLogsPage = {
  init() {
    this.render();
  },

  render() {
    const tbody = document.getElementById('audit-table-body');
    if (!tbody) return;

    const list = Store.getAll('audit_logs');
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Belum ada catatan aktivitas audit log.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((a, idx) => {
      const badgeClass = {
        INSERT: 'bg-success',
        UPDATE: 'bg-primary',
        DELETE: 'bg-danger'
      }[a.aksi] || 'bg-secondary';

      return `
        <tr>
          <td class="text-center text-muted fw-bold">${idx + 1}</td>
          <td>
            <div>${Helpers.formatDate(a.created_at, true)}</div>
            <small class="text-muted">${a.created_at ? new Date(a.created_at).toLocaleTimeString() : '-'}</small>
          </td>
          <td>
            <strong>${a.username}</strong>
            <div class="fs-8 text-muted">${a.role}</div>
          </td>
          <td class="text-center"><span class="badge ${badgeClass}">${a.aksi}</span></td>
          <td><span class="badge bg-light text-dark border">${a.tabel_terkait}</span></td>
          <td><small>${a.deskripsi}</small></td>
          <td class="text-center">
            <button class="btn btn-sm btn-outline-info" onclick="AuditLogsPage.viewDiff('${a.id}')" title="Detail Perubahan"><i class="bi bi-info-circle"></i></button>
          </td>
        </tr>
      `;
    }).join('');
  },

  viewDiff(id) {
    const log = Store.getById('audit_logs', id);
    if (!log) return;

    const content = document.getElementById('modal-audit-diff-content');
    if (content) {
      content.innerHTML = `
        <h6>Informasi Aktor</h6>
        <p class="mb-2"><strong>${log.username}</strong> (${log.role}) &bull; Waktu: ${Helpers.formatDate(log.created_at, true)}</p>
        <hr>
        <h6>Data Lama (Old Row)</h6>
        <pre class="bg-light p-2 border rounded fs-8">${log.data_lama ? JSON.stringify(log.data_lama, null, 2) : 'Tidak ada (INSERT)'}</pre>
        <h6>Data Baru (New Row)</h6>
        <pre class="bg-light p-2 border rounded fs-8">${log.data_baru ? JSON.stringify(log.data_baru, null, 2) : 'Tidak ada (DELETE)'}</pre>
      `;
    }
    new bootstrap.Modal(document.getElementById('modal-audit-diff')).show();
  },

  exportExcel() {
    const data = Store.getAll('audit_logs').map((a, i) => ({
      No: i + 1,
      Waktu: a.created_at,
      Pengguna: a.username,
      Role: a.role,
      Aksi: a.aksi,
      Tabel: a.tabel_terkait,
      Deskripsi: a.deskripsi
    }));
    ExportUtils.exportToExcel(data, 'Audit_Logs_APDAGU', 'Audit');
  }
};
