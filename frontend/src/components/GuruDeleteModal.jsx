import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function GuruDeleteModal({ isOpen, onClose, guru }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  if (!isOpen || !guru) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('guru')
        .delete()
        .eq('id', guru.id);

      if (deleteError) throw deleteError;

      onClose();
      queryClient.invalidateQueries({ queryKey: ['guru'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Hapus Data Guru?</h2>
          <p className="text-sm text-slate-500 mb-6">
            Apakah Anda yakin ingin menghapus data <strong>{guru.nama_lengkap}</strong>? Tindakan ini tidak dapat dibatalkan.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Hapus
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
