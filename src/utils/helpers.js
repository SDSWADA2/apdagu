/**
 * ============================================================================
 * HELPER UTILITIES — FORMATTERS & CALCULATION LOGIC
 * APDAGU Enterprise v2.0
 * ============================================================================
 */

export const Helpers = {
  formatNamaGelar(guru) {
    if (!guru) return '-';
    let nama = guru.nama_lengkap || '';
    if (guru.gelar_depan) nama = `${guru.gelar_depan} ${nama}`;
    if (guru.gelar_belakang) nama = `${nama}, ${guru.gelar_belakang}`;
    return nama.trim() || '-';
  },

  formatDate(dateStr, withDay = false) {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Jakarta'
      };
      if (withDay) options.weekday = 'long';
      return new Intl.DateTimeFormat('id-ID', options).format(d);
    } catch (e) {
      return dateStr;
    }
  },

  formatTime(timeStr) {
    if (!timeStr) return '-';
    return timeStr.substring(0, 5) + ' WIB';
  },

  formatRupiah(amount) {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  },

  getInitials(name) {
    if (!name) return 'SD';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  },

  generateAvatarSvg(name, bg = '#2563eb') {
    const initials = this.getInitials(name);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <rect width="128" height="128" rx="28" fill="${bg}"/>
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="'Plus Jakarta Sans', sans-serif" font-size="46" font-weight="700">${initials}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  },

  validate24JP(totalJP) {
    const jp = Number(totalJP) || 0;
    if (jp >= 24) {
      return {
        status: 'Terpenuhi',
        badge: 'bg-success',
        icon: 'bi-check-circle-fill',
        message: `Beban mengajar terpenuhi (${jp} JP / 24 JP)`
      };
    }
    return {
      status: 'Belum Terpenuhi',
      badge: 'bg-danger',
      icon: 'bi-exclamation-triangle-fill',
      message: `Kurang ${24 - jp} JP (${jp} / 24 JP)`
    };
  },

  getPredikatPKG(nilaiAkhir) {
    const n = parseFloat(nilaiAkhir) || 0;
    if (n >= 91) return { predikat: 'Amat Baik', badge: 'bg-success', persentase: '125%' };
    if (n >= 76) return { predikat: 'Baik', badge: 'bg-primary', persentase: '100%' };
    if (n >= 61) return { predikat: 'Cukup', badge: 'bg-info text-dark', persentase: '75%' };
    if (n >= 51) return { predikat: 'Sedang', badge: 'bg-warning text-dark', persentase: '50%' };
    return { predikat: 'Kurang', badge: 'bg-danger', persentase: '25%' };
  },

  getStatusKehadiranBadge(status) {
    switch (status) {
      case 'Hadir': return 'bg-success';
      case 'Izin': return 'bg-warning text-dark';
      case 'Sakit': return 'bg-info text-dark';
      case 'Dinas Luar': return 'bg-primary';
      case 'Cuti': return 'bg-secondary';
      case 'Alpha': return 'bg-danger';
      default: return 'bg-light text-dark';
    }
  },

  debounce(func, wait = 100) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  calculateDistanceMeter(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }
};
