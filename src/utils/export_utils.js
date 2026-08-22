/**
 * ============================================================================
 * EXPORT UTILITIES — EXCEL (SHEETJS), PDF (JSPDF), PRINT A4
 * APDAGU Enterprise v2.0
 * ============================================================================
 */

import { Helpers } from './helpers.js';
import { Toast } from './toast.js';

export const ExportUtils = {
  /**
   * Export array of objects to Excel file (.xlsx)
   */
  exportToExcel(data, fileName, sheetName = 'Data') {
    if (typeof XLSX === 'undefined') {
      Toast.error('Gagal Ekspor', 'Pustaka SheetJS (XLSX) tidak tersedia.');
      return;
    }
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      Toast.success('Ekspor Berhasil', `File ${fileName}.xlsx berhasil diunduh.`);
    } catch (e) {
      console.error(e);
      Toast.error('Ekspor Gagal', e.message);
    }
  },

  /**
   * Print an HTML element with official school letterhead in A4 format
   */
  printA4(elementIdOrHtml, title = 'Dokumen Sekolah') {
    const printContainer = document.getElementById('print-a4-container') || document.body;
    let content = '';

    if (typeof elementIdOrHtml === 'string' && document.getElementById(elementIdOrHtml)) {
      content = document.getElementById(elementIdOrHtml).innerHTML;
    } else {
      content = elementIdOrHtml;
    }

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <link rel="stylesheet" href="css/print.css">
        <style>
          @page { size: A4; margin: 15mm 15mm 15mm 15mm; }
          body { font-family: 'Times New Roman', serif; color: #000; background: #fff; font-size: 12pt; line-height: 1.4; }
          .kop-surat { border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 15px; text-align: center; }
          .kop-surat h4 { font-size: 14pt; margin: 0; font-weight: bold; text-transform: uppercase; }
          .kop-surat h3 { font-size: 16pt; margin: 2px 0; font-weight: bold; }
          .kop-surat p { font-size: 10pt; margin: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          table, th, td { border: 1px solid #000; }
          th, td { padding: 6px 8px; font-size: 10.5pt; }
          th { background-color: #f2f2f2 !important; text-align: center; }
          .no-border, .no-border td { border: none !important; }
        </style>
      </head>
      <body>
        <div class="kop-surat">
          <h4>PEMERINTAH KABUPATEN PAMEKASAN</h4>
          <h4>DINAS PENDIDIKAN DAN KEBUDAYAAN</h4>
          <h3>SD NEGERI SUMBER WARU 2</h3>
          <p>Kecamatan Waru &bull; NPSN: 20527136 &bull; Kode Pos 69353</p>
          <p>Email: sdnegerisumberwaru2@gmail.com &bull; Telp/WA: 0819-5381-2155</p>
        </div>
        ${content}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
      setTimeout(() => printFrame.remove(), 2000);
    }, 500);
  },

  /**
   * Export element to PDF using jsPDF + html2canvas
   */
  async exportToPDF(elementId, fileName = 'Dokumen') {
    const el = document.getElementById(elementId);
    if (!el) {
      Toast.error('Gagal Ekspor PDF', 'Elemen tidak ditemukan.');
      return;
    }

    if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
      Toast.error('Gagal Ekspor PDF', 'Pustaka jsPDF / html2canvas tidak tersedia.');
      return;
    }

    try {
      Toast.info('Memproses PDF', 'Sedang merender halaman dokumen...');
      const canvas = await html2canvas(el, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${fileName}_${new Date().toISOString().slice(0, 10)}.pdf`);
      Toast.success('Ekspor PDF Berhasil', `File ${fileName}.pdf berhasil diunduh.`);
    } catch (e) {
      console.error(e);
      Toast.error('Ekspor PDF Gagal', e.message);
    }
  }
};
