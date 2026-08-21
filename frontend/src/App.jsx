import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';

// Lazy loading komponen halaman untuk performa lebih cepat (Code Splitting)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DataGuru = lazy(() => import('./pages/DataGuru'));

// Fallback skeleton loader saat komponen sedang di-lazy load
const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={
            <Suspense fallback={<PageLoader />}>
              <Dashboard />
            </Suspense>
          } />
          <Route path="guru" element={
            <Suspense fallback={<PageLoader />}>
              <DataGuru />
            </Suspense>
          } />
          
          {/* Placeholder routes untuk modul lain */}
          <Route path="pendidikan" element={<div className="p-4">Modul Pendidikan (Tahap Migrasi)</div>} />
          <Route path="sertifikasi" element={<div className="p-4">Modul Sertifikasi (Tahap Migrasi)</div>} />
          <Route path="kepegawaian" element={<div className="p-4">Modul Kepegawaian (Tahap Migrasi)</div>} />
          
          {/* Tangkap semua rute tidak valid */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App;
