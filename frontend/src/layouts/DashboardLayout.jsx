import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Users, GraduationCap, Award, Briefcase, Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Data Guru', href: '/guru', icon: Users },
    { name: 'Pendidikan', href: '/pendidikan', icon: GraduationCap },
    { name: 'Sertifikasi', href: '/sertifikasi', icon: Award },
    { name: 'Kepegawaian', href: '/kepegawaian', icon: Briefcase },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar untuk Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <div className="flex items-center gap-3 text-blue-600 font-bold text-lg">
            <GraduationCap className="w-6 h-6" />
            <span>SDN Sumber Waru 2</span>
          </div>
        </div>
        
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={() => signOut()}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Konten Utama */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Mobile */}
        <header className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4">
          <div className="flex items-center gap-2 text-blue-600 font-bold">
            <GraduationCap className="w-5 h-5" />
            <span>SDN SW 2</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Area Konten (Outlet) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Overlay Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setIsMobileMenuOpen(false)} />
          <nav className="fixed top-0 left-0 bottom-0 w-64 bg-white flex flex-col">
            <div className="h-16 flex items-center px-6 border-b border-slate-200">
              <span className="text-blue-600 font-bold text-lg">Menu Navigasi</span>
            </div>
            <div className="flex-1 py-4 px-3 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
