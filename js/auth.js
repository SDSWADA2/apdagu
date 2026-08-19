  _restoreSession() {
    try {
      const raw = sessionStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return false;

      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.username) return false;

      // Normalisasi role ke lowercase untuk konsistensi
      if (parsed.role) parsed.role = String(parsed.role).toLowerCase();

      this.currentUser = parsed;
      this._lastActivity = parsed._lastActivity || Date.now();

      // Simpan kembali untuk memastikan format konsisten di storage
      this._refreshSession();
      console.log('[Auth] Sesi dipulihkan dari storage untuk user:', this.currentUser.username);
      return true;
    } catch (e) {
      console.warn('[Auth] Gagal memulihkan sesi:', e);
      return false;
    }
  },

  // Modifikasi switchRole untuk pencocokan role case-insensitive
  switchRole(targetRole) {
    const users = DB.getAll('users');
    const targetUser = users.find(u => String(u.role).toLowerCase() === String(targetRole).toLowerCase());
    if (!targetUser) return false;
    this.currentUser = { ...targetUser };
    // Normalisasi role
    if (this.currentUser.role) this.currentUser.role = String(this.currentUser.role).toLowerCase();
    this._refreshSession();
    this.applyUIPermissions();
    return true;
  },
