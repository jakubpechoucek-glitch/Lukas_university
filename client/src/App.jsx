import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import Prediction from './pages/Prediction';
import Subjects from './pages/Subjects';
import Matrix from './pages/Matrix';

function DataGate() {
  const { catalog, student, error, reload } = useData();
  if (error) {
    return (
      <div className="card text-center">
        <p className="text-red-600">{error}</p>
        <button className="btn-secondary mt-3" onClick={reload}>Zkusit znovu</button>
      </div>
    );
  }
  if (!catalog || !student) return <div className="py-16 text-center text-slate-500">Načítám…</div>;
  return <Outlet />;
}

// Jedna společná vrstva pro všechny chráněné stránky – data se načtou jednou a sdílí se mezi stránkami.
function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.isFirstLogin) return <Navigate to="/change-password" replace />;
  return (
    <DataProvider>
      <Layout>
        <DataGate />
      </Layout>
    </DataProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/katalog" element={<Catalog />} />
            <Route path="/predikce" element={<Prediction />} />
            <Route path="/predmety" element={<Subjects />} />
            <Route path="/matice" element={<Matrix />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
