import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Filter } from 'lucide-react';

export default function DataGuru() {
  const [guruList, setGuruList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fungsi untuk menarik data dari Supabase (Pagination & Lazy Loading akan diimplementasi di sini)
  useEffect(() => {
    async function fetchGuru() {
      try {
        setLoading(true);
        // Menggunakan select('*') dengan limit untuk contoh awal pagination
        const { data, error } = await supabase
          .from('guru')
          .select('*')
          .limit(10);
          
        if (error) throw error;
        setGuruList(data || []);
      } catch (error) {
        console.error('Error fetching guru:', error.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchGuru();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Guru & PTK</h1>
          <p className="text-slate-500 text-sm">Kelola master data pendidik dan tenaga kependidikan</p>
        </div>
        
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          <Plus className="w-4 h-4" />
          Tambah Guru
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50 rounded-t-xl">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari nama, NIP, atau NUPTK..." 
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow text-sm"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : guruList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <p>Belum ada data guru ditemukan.</p>
              <p className="text-sm">Pastikan Supabase sudah terhubung dan tabel guru memiliki data.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-sm">
                  <th className="p-4 font-medium whitespace-nowrap">Nama Lengkap</th>
                  <th className="p-4 font-medium whitespace-nowrap">NIP / NUPTK</th>
                  <th className="p-4 font-medium whitespace-nowrap">Status Keaktifan</th>
                  <th className="p-4 font-medium whitespace-nowrap text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {guruList.map((guru) => (
                  <tr key={guru.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{guru.nama_lengkap}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{guru.jenis_kelamin}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-900">{guru.nip || '-'}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{guru.nuptk || '-'}</div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        {guru.status_keaktifan}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">Detail</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 rounded-b-xl">
          <span className="text-sm text-slate-500">Menampilkan 1-10 dari total data</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-slate-300 rounded text-sm text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50">Sebelumnnya</button>
            <button className="px-3 py-1 border border-slate-300 rounded text-sm text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50">Selanjutnya</button>
          </div>
        </div>
      </div>
    </div>
  )
}
