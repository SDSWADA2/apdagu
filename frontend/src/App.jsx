import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';

// Lazy loading komponen halaman
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DataGuru = lazy(() => import('./pages/DataGuru'));
const Login = lazy(() => import('./pages/Login'));

// Komponen loader
const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// Wrapper proteksi rute
const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="guru" element={<DataGuru />} />
              
              <Route path="pendidikan" element={<div className="p-4">Modul Pendidikan (Tahap Migrasi)</div>} />
              <Route path="sertifikasi" element={<div className="p-4">Modul Sertifikasi (Tahap Migrasi)</div>} />
              <Route path="kepegawaian" element={<div className="p-4">Modul Kepegawaian (Tahap Migrasi)</div>} />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App;
