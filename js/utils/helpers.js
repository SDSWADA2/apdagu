/**
 * ============================================================================
 * HELPER UTILITIES - APLIKASI DATABASE GURU SD NEGERI SUMBER WARU 2
 * ============================================================================
 */

const Helpers = {
  /**
   * Format tanggal ke standar Indonesia (e.g. 14 Agustus 2026)
   */
  formatDateIndo(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  },

  /**
   * Hitung umur secara presisi dari tanggal lahir
   */
  calculateAge(birthDateStr) {
    if (!birthDateStr) return 0;
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : 0;
  },

  /**
   * Hitung masa kerja dari TMT (Terhitung Mulai Tanggal)
   * Mengembalikan string: "X Tahun Y Bulan"
   */
  calculateMasaKerja(tmtStr) {
    if (!tmtStr) return { tahun: 0, bulan: 0, text: '-' };
    const tmt = new Date(tmtStr);
    const now = new Date();
    
    let years = now.getFullYear() - tmt.getFullYear();
    let months = now.getMonth() - tmt.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    if (now.getDate() < tmt.getDate()) {
      months--;
      if (months < 0) {
        years--;
        months += 12;
      }
    }
    
    return {
      tahun: Math.max(0, years),
      bulan: Math.max(0, months),
      text: `${Math.max(0, years)} Tahun ${Math.max(0, months)} Bulan`
    };
  },

  /**
   * Konversi skor angka PKG ke Predikat Standar Kemendikbud
   */
  getPredikatPKG(nilai) {
    const score = parseFloat(nilai) || 0;
    if (score >= 91) return { predikat: 'Amat Baik', class: 'text-success', badge: 'bg-success', persentase: '125%' };
    if (score >= 76) return { predikat: 'Baik', class: 'text-primary', badge: 'bg-primary', persentase: '100%' };
    if (score >= 61) return { predikat: 'Cukup', class: 'text-warning', badge: 'bg-warning text-dark', persentase: '75%' };
    if (score >= 51) return { predikat: 'Sedang', class: 'text-warning', badge: 'bg-warning text-dark', persentase: '50%' };
    return { predikat: 'Kurang', class: 'text-danger', badge: 'bg-danger', persentase: '25%' };
  },

  /**
   * Validasi pemenuhan syarat 24 JP per minggu
   */
  validate24JP(totalJP) {
    const jp = parseInt(totalJP) || 0;
    if (jp >= 24) {
      return {
        status: 'Terpenuhi',
        badge: 'bg-success',
        icon: 'bi-check-circle-fill',
        text: `Terpenuhi (${jp} JP)`
      };
    }
    return {
      status: 'Belum Terpenuhi',
      badge: 'bg-danger',
      icon: 'bi-exclamation-triangle-fill',
      text: `Kurang ${24 - jp} JP (${jp} / 24 JP)`
    };
  },

  /**
   * Format Rupiah
   */
  formatRupiah(amount) {
    if (!amount) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  },

  /**
   * Generate UUID / ID numerik unik
   */
  generateId() {
    return Date.now() + Math.floor(Math.random() * 1000);
  },

  /**
   * Escape HTML untuk keamanan XSS
   */
  escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Format nama lengkap beserta gelar depan dan gelar belakang
   */
  formatNamaGelar(guru) {
    if (!guru) return '-';
    const depan = guru.gelar_depan ? `${guru.gelar_depan.trim()} ` : '';
    const belakang = guru.gelar_belakang ? `, ${guru.gelar_belakang.trim()}` : '';
    return `${depan}${guru.nama_lengkap}${belakang}`;
  },

  /**
   * Mendapatkan inisial dari nama
   */
  getInitials(name) {
    if (!name) return 'SD';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  },

  /**
   * Dapatkan jumlah hari dalam bulan tertentu
   */
  getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  },

  /**
   * Dapatkan nama hari Indonesia singkat (Sen, Sel, Rab, Kam, Jum, Sab, Min)
   */
  getDayNameShort(year, month, day) {
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const date = new Date(year, month - 1, day);
    return days[date.getDay()];
  },

  /**
   * Cek apakah hari adalah akhir pekan (Minggu)
   */
  isSunday(year, month, day) {
    const date = new Date(year, month - 1, day);
    return date.getDay() === 0;
  },

  /**
   * Hitung selisih menit keterlambatan jika jam masuk melebihi batas toleransi
   */
  calculateLateness(actualTime, toleranceTime = '07:00') {
    if (!actualTime || !toleranceTime) return 0;
    const [actH, actM] = actualTime.split(':').map(Number);
    const [tolH, tolM] = toleranceTime.split(':').map(Number);
    const actMinutes = actH * 60 + actM;
    const tolMinutes = tolH * 60 + tolM;
    return Math.max(0, actMinutes - tolMinutes);
  }
};
