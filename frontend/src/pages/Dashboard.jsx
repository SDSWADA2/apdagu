export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard Eksekutif</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium mb-1">Total Guru</div>
          <div className="text-3xl font-bold text-slate-900">0</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium mb-1">PNS / PPPK</div>
          <div className="text-3xl font-bold text-blue-600">0</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium mb-1">Sudah Sertifikasi</div>
          <div className="text-3xl font-bold text-emerald-600">0</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium mb-1">Honorer (GTT)</div>
          <div className="text-3xl font-bold text-amber-500">0</div>
        </div>
      </div>

      <div className="bg-blue-50 text-blue-700 p-4 rounded-lg border border-blue-100">
        Modul Dashboard dalam tahap migrasi ke React. Grafik Chart.js akan ditambahkan di fase selanjutnya.
      </div>
    </div>
  )
}
