import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Search, Plus, Filter, Loader2, Edit, Trash2 } from 'lucide-react';
import GuruFormModal from '../components/GuruFormModal';
import GuruDeleteModal from '../components/GuruDeleteModal';

export default function DataGuru() {
  const [page, setPage] = useState(0);
  const limit = 10;
  const queryClient = useQueryClient();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedGuru, setSelectedGuru] = useState(null);

  const openFormModal = (guru = null) => {
    setSelectedGuru(guru);
    setIsFormModalOpen(true);
  };

  const openDeleteModal = (guru) => {
    setSelectedGuru(guru);
    setIsDeleteModalOpen(true);
  };

  useEffect(() => {
    // Berlangganan perubahan pada tabel guru untuk fitur realtime
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guru',
        },
        () => {
          // Invalidate cache react-query saat ada perubahan di tabel guru
          queryClient.invalidateQueries({ queryKey: ['guru'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['guru', page],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('guru')
        .select('*', { count: 'exact' })
        .range(page * limit, (page + 1) * limit - 1);
        
      if (error) throw error;
      return { guru: data || [], count: count || 0 };
    },
    // Tetap menyimpan data lama saat mengambil halaman baru
    placeholderData: (previousData) => previousData,
  });

  const guruList = data?.guru || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Guru & PTK</h1>
          <p className="text-slate-500 text-sm">Kelola master data pendidik dan tenaga kependidikan</p>
        </div>
        
        <button 
          onClick={() => openFormModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
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
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center h-48 text-red-500">
              <p>Terjadi kesalahan: {error.message}</p>
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
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => openFormModal(guru)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openDeleteModal(guru)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 rounded-b-xl">
          <span className="text-sm text-slate-500">
            Menampilkan {guruList.length > 0 ? page * limit + 1 : 0}-
            {Math.min((page + 1) * limit, totalCount)} dari {totalCount} data
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(old => Math.max(old - 1, 0))}
              disabled={page === 0}
              className="px-3 py-1 border border-slate-300 rounded text-sm text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <button 
              onClick={() => setPage(old => (page + 1 < totalPages ? old + 1 : old))}
              disabled={page + 1 >= totalPages}
              className="px-3 py-1 border border-slate-300 rounded text-sm text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      <GuruFormModal 
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        guru={selectedGuru}
      />
      <GuruDeleteModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        guru={selectedGuru}
      />
    </div>
  )
}
