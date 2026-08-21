import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { GraduationCap, Award, Loader2, Plus, Edit, Trash2 } from 'lucide-react';

export default function PendidikanSertifikasi() {
  const [activeTab, setActiveTab] = useState('pendidikan'); // 'pendidikan' or 'sertifikasi'

  // Fetch Pendidikan
  const { data: pendidikanList, isLoading: isPendidikanLoading } = useQuery({
    queryKey: ['pendidikan'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pendidikan')
        .select('*, guru(nama_lengkap)')
        .order('tahun_lulus', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch Sertifikasi
  const { data: sertifikasiList, isLoading: isSertifikasiLoading } = useQuery({
    queryKey: ['sertifikasi'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sertifikasi')
        .select('*, guru(nama_lengkap)')
        .order('tahun_sertifikasi', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Riwayat Pendidikan & Sertifikasi</h1>
          <p className="text-slate-500 text-sm">Kelola data pendidikan terakhir dan sertifikasi guru</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          <Plus className="w-4 h-4" />
          Tambah Data
        </button>
      </div>

      <div className="flex gap-4 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('pendidikan')}
          className={`pb-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'pendidikan' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Riwayat Pendidikan
        </button>
        <button
          onClick={() => setActiveTab('sertifikasi')}
          className={`pb-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'sertifikasi' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Award className="w-4 h-4" />
          Sertifikasi & PPG
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 overflow-auto">
        {activeTab === 'pendidikan' && (
          isPendidikanLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : pendidikanList?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <p>Belum ada data riwayat pendidikan.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-sm">
                  <th className="p-4 font-medium">Nama Guru</th>
                  <th className="p-4 font-medium">Jenjang</th>
                  <th className="p-4 font-medium">Program Studi</th>
                  <th className="p-4 font-medium">Institusi</th>
                  <th className="p-4 font-medium">Tahun Lulus</th>
                  <th className="p-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {pendidikanList.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-4 font-medium text-slate-900">{item.guru?.nama_lengkap || '-'}</td>
                    <td className="p-4"><span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">{item.jenjang}</span></td>
                    <td className="p-4">{item.program_studi}</td>
                    <td className="p-4 text-slate-600">{item.nama_institusi}</td>
                    <td className="p-4 text-slate-600">{item.tahun_lulus}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                        <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {activeTab === 'sertifikasi' && (
          isSertifikasiLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : sertifikasiList?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <p>Belum ada data sertifikasi.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-sm">
                  <th className="p-4 font-medium">Nama Guru</th>
                  <th className="p-4 font-medium">Bidang Studi</th>
                  <th className="p-4 font-medium">No. Sertifikat</th>
                  <th className="p-4 font-medium">Tahun</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {sertifikasiList.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-4 font-medium text-slate-900">{item.guru?.nama_lengkap || '-'}</td>
                    <td className="p-4">{item.bidang_studi}</td>
                    <td className="p-4 text-slate-600">{item.nomor_sertifikat}</td>
                    <td className="p-4 text-slate-600">{item.tahun_sertifikasi}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.status_berlaku === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.status_berlaku}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                        <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
