import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await login(email, password);
      navigate(u.isFirstLogin ? '/change-password' : '/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Přihlášení se nezdařilo');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Lukas University</h1>
        <label className="block text-sm">
          E-mail
          <input className="input mt-1" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="block text-sm">
          Heslo
          <input className="input mt-1" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>Přihlásit</button>
        <p className="text-center text-sm text-slate-500">
          Nemáte účet? <a href="/?demo" className="font-medium text-slate-700 underline underline-offset-2">Vyzkoušet ukázku</a> se smyšlenými známkami.
        </p>
      </form>
    </div>
  );
}
