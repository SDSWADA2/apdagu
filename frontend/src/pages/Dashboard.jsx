import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Berlangganan perubahan pada tabel guru untuk fitur realtime
    const channel = supabase
      .channel('schema-db-changes-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
        },
        () => {
          // Invalidate cache react-query saat ada perubahan tabel apa pun
          queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: async () => {
      // Mengambil total guru
      const { count: totalGuru } = await supabase
        .from('guru')
        .select('*', { count: 'exact', head: true });

      // Mengambil guru yang bersertifikasi
      const { count: totalSertifikasi } = await supabase
        .from('sertifikasi')
        .select('*', { count: 'exact', head: true })
        .eq('status_berlaku', 'Aktif');

      // Karena kita hanya butuh jumlah kasar untuk dashboard
      return {
        totalGuru: totalGuru || 0,
        sertifikasi: totalSertifikasi || 0,
        pns: 0, // Placeholder, akan diambil dari tabel kepegawaian
        honorer: 0 // Placeholder
      };
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard Eksekutif</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium mb-1">Total Guru</div>
          <div className="text-3xl font-bold text-slate-900">{stats?.totalGuru}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium mb-1">PNS / PPPK</div>
          <div className="text-3xl font-bold text-blue-600">{stats?.pns}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium mb-1">Sudah Sertifikasi</div>
          <div className="text-3xl font-bold text-emerald-600">{stats?.sertifikasi}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium mb-1">Honorer (GTT)</div>
          <div className="text-3xl font-bold text-amber-500">{stats?.honorer}</div>
        </div>
      </div>

      <div className="bg-blue-50 text-blue-700 p-4 rounded-lg border border-blue-100">
        Dashboard sudah terhubung dengan Supabase React Query. Grafik Chart.js akan ditambahkan pada tahap selanjutnya.
      </div>
    </div>
  )
}
