import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function ChangePassword() {
  const { user, loading, changePassword } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (next !== confirm) return setError('Hesla se neshodují');
    try {
      await changePassword(current, next);
      toast.success('Heslo změněno');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Změna hesla se nezdařila');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Změna hesla</h1>
        {user.isFirstLogin && <p className="text-sm text-slate-600">Při prvním přihlášení si nastavte vlastní heslo.</p>}
        {!user.isFirstLogin && (
          <label className="block text-sm">
            Současné heslo
            <input className="input mt-1" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </label>
        )}
        <label className="block text-sm">
          Nové heslo
          <input className="input mt-1" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
        </label>
        <label className="block text-sm">
          Nové heslo znovu
          <input className="input mt-1" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </label>
        <p className="text-xs text-slate-500">Aspoň 8 znaků, velké a malé písmeno a číslice.</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full">Uložit heslo</button>
      </form>
    </div>
  );
}
