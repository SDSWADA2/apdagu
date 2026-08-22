/**
 * ============================================================================
 * AUTHENTICATION SERVICE — SUPABASE AUTH & PROFILES
 * APDAGU Enterprise v2.0
 * ============================================================================
 */

import { getSupabase } from './supabase.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.currentProfile = null;
    this.authListeners = new Set();
  }

  async init() {
    const supabase = await getSupabase();
    if (!supabase) return null;

    try {
      // ── MOCK SESSION CHECK ──
      const mockSession = localStorage.getItem('apdagu_demo_auth');
      if (mockSession) {
        try {
          const parsed = JSON.parse(mockSession);
          this.currentUser = parsed.user;
          this.currentProfile = parsed.profile;
          return this.currentUser;
        } catch (e) {
          localStorage.removeItem('apdagu_demo_auth');
        }
      }

      // Listen for Supabase auth state change
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          this.currentUser = session.user; // FIX: Set currentUser sebelum loadProfile
          await this.loadProfile(session.user.id);
        } else {
          this.currentUser = null;
          this.currentProfile = null;
        }
        this.notifyListeners(event);
      });

      // Check existing session
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('[AuthService] getSession error:', error.message);
      }

      if (session?.user) {
        this.currentUser = session.user;
        await this.loadProfile(session.user.id);
      }
    } catch (err) {
      console.error('[AuthService] init error:', err);
    }

    return this.currentUser;
  }

  async loadProfile(userId) {
    const supabase = await getSupabase();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('[AuthService] Profile fetch warning:', error.message);
      }

      if (data) {
        this.currentProfile = data;
      } else {
        // Fallback profile jika row belum dibuat oleh trigger
        this.currentProfile = {
          id: userId,
          role: 'guru',
          nama_lengkap: this.currentUser?.email?.split('@')[0] || 'Pengguna',
          email: this.currentUser?.email
        };
      }
      return this.currentProfile;
    } catch (e) {
      console.warn('[AuthService] Error loading profile:', e.message);
      return null;
    }
  }

  async login(email, password) {
    const supabase = await getSupabase();
    if (!supabase) throw new Error('Koneksi Supabase tidak tersedia.');

    // Support demo shortcut login
    let loginEmail = email.trim();
    if (!loginEmail.includes('@')) {
      if (loginEmail === 'admin') loginEmail = 'admin@sdnsumberwaru2.sch.id';
      else if (loginEmail === 'operator') loginEmail = 'operator@sdnsumberwaru2.sch.id';
      else loginEmail = `${loginEmail}@sdnsumberwaru2.sch.id`;
    }

    let loginResult = null;
    let loginError = null;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password
      });
      if (error) throw error;
      loginResult = data;
    } catch (err) {
      loginError = err;
    }

    // ── FALLBACK DEMO / OFFLINE MODE ──
    // Jika gagal login ke Supabase (karena belum daftar, offline, dll), gunakan mock login
    if (loginError) {
      console.warn('[AuthService] Supabase login failed, attempting local fallback...', loginError.message);

      const isDemoAdmin = loginEmail === 'admin@sdnsumberwaru2.sch.id' && password === 'admin123';
      const isDemoOperator = loginEmail === 'operator@sdnsumberwaru2.sch.id' && password === 'operator123';
      const isDemoGuru = loginEmail === 'guru@sdnsumberwaru2.sch.id' && password === 'guru123';

      if (isDemoAdmin || isDemoOperator || isDemoGuru) {
        const role = isDemoAdmin ? 'admin' : isDemoOperator ? 'operator' : 'guru';
        const nama = isDemoAdmin ? 'Administrator' : isDemoOperator ? 'Operator Sekolah' : 'Guru Demo';
        const fakeUserId = `demo-${role}-${Date.now()}`;

        // Mock Supabase session behavior for frontend
        this.currentUser = {
          id: fakeUserId,
          email: loginEmail,
          user_metadata: { role }
        };

        this.currentProfile = {
          id: fakeUserId,
          role: role,
          nama_lengkap: nama,
          email: loginEmail,
          _is_demo: true
        };

        // Persist mock session
        localStorage.setItem('apdagu_demo_auth', JSON.stringify({
          user: this.currentUser,
          profile: this.currentProfile
        }));

        // Notify app
        this.notifyListeners('SIGNED_IN');
        return { user: this.currentUser, profile: this.currentProfile };
      } else {
        // Jika bukan demo/hardcoded fallback, lemparkan error aslinya
        throw loginError;
      }
    }

    // ── ONLINE SUCCESS ──
    this.currentUser = loginResult.user;
    await this.loadProfile(loginResult.user.id);
    this.notifyListeners('SIGNED_IN');
    return { user: this.currentUser, profile: this.currentProfile };
  }

  async logout() {
    const supabase = await getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    this.currentUser = null;
    this.currentProfile = null;
    localStorage.removeItem('apdagu_auth_token');
    localStorage.removeItem('apdagu_demo_auth');
    this.notifyListeners('SIGNED_OUT');
  }

  async changePassword(newPassword) {
    const supabase = await getSupabase();
    if (!supabase) throw new Error('Koneksi Supabase tidak tersedia.');

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
    return data;
  }

  getUser() {
    return this.currentUser;
  }

  getProfile() {
    return this.currentProfile || {
      role: 'guru',
      nama_lengkap: 'Tamu',
      email: ''
    };
  }

  getRole() {
    return this.currentProfile?.role || 'guru';
  }

  isAdmin() {
    return this.getRole() === 'admin';
  }

  isOperator() {
    return this.getRole() === 'operator';
  }

  isAdminOrOperator() {
    return ['admin', 'operator'].includes(this.getRole());
  }

  /**
   * Apakah user bisa mengedit guru tertentu?
   * Admin/Operator bisa semua. Guru hanya profilnya sendiri.
   */
  canEditGuru(guruId) {
    if (this.isAdminOrOperator()) return true;
    return this.currentProfile?.guru_id === guruId;
  }

  /**
   * Apakah guru terautentikasi bisa melihat profil guru tertentu?
   * Admin/Operator bisa semua. Guru hanya profilnya sendiri.
   */
  canViewGuruProfile(guruId) {
    if (this.isAdminOrOperator()) return true;
    return this.currentProfile?.guru_id === guruId;
  }

  onAuthStateChange(callback) {
    this.authListeners.add(callback);
    return () => this.authListeners.delete(callback);
  }

  notifyListeners(event) {
    for (const callback of this.authListeners) {
      try {
        callback(event, { user: this.currentUser, profile: this.currentProfile });
      } catch (err) {
        console.error('[AuthService] Listener error:', err);
      }
    }
  }
}

export const Auth = new AuthService();
