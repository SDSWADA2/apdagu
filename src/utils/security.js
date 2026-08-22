/**
 * ============================================================================
 * SECURITY UTILITIES — XSS SANITIZATION & INPUT VALIDATION
 * APDAGU Enterprise v2.0
 * ============================================================================
 */

export const Security = {
  /**
   * Escape HTML strings to prevent XSS attacks
   */
  escapeHTML(str) {
    if (typeof str !== 'string') return str ?? '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Validasi NIP (18 digit standar BKN)
   */
  isValidNIP(nip) {
    if (!nip) return true; // Optional field
    const clean = nip.replace(/\s+/g, '');
    return /^\d{18}$/.test(clean);
  },

  /**
   * Validasi NUPTK (16 digit standar Kemendikbud)
   */
  isValidNUPTK(nuptk) {
    if (!nuptk) return true;
    const clean = nuptk.replace(/\s+/g, '');
    return /^\d{16}$/.test(clean);
  },

  /**
   * Validasi NIK (16 digit KTP)
   */
  isValidNIK(nik) {
    if (!nik) return true;
    const clean = nik.replace(/\s+/g, '');
    return /^\d{16}$/.test(clean);
  },

  /**
   * Validasi Nomor HP / WhatsApp
   */
  isValidPhone(phone) {
    if (!phone) return false;
    const clean = phone.replace(/[\s-+()]/g, '');
    return /^08\d{8,12}$/.test(clean) || /^628\d{8,12}$/.test(clean);
  }
};
