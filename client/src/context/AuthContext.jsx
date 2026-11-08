import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

// Rozcestník předá přihlášení v adrese jako #sso=<token>. Přečíst hned při načtení modulu
// (před prvním renderem) a z adresy smazat, aby token nezůstal v historii.
const ssoToken = (() => {
  const m = /[#&]sso=([^&]+)/.exec(window.location.hash);
  if (!m) return null;
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  try { return decodeURIComponent(m[1]); } catch { return null; }
})();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ssoError, setSsoError] = useState('');

  const loadUser = useCallback(async () => {
    if (ssoToken) {
      try {
        const { data } = await api.post('/auth/sso', { token: ssoToken });
        localStorage.setItem('token', data.data.token);
        setUser(data.data.user);
        setLoading(false);
        return;
      } catch (err) {
        setSsoError(err.response?.data?.error || 'Přihlášení přes rozcestník se nezdařilo');
      }
    }
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.data);
    } catch {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.data.token);
    setUser(data.data.user);
    return data.data.user;
  }

  async function logout() {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('token');
    setUser(null);
  }

  async function changePassword(currentPassword, newPassword) {
    await api.post('/auth/change-password', { currentPassword, newPassword });
    const { data } = await api.get('/auth/me');
    setUser(data.data);
  }

  return (
    <AuthContext.Provider value={{ user, loading, ssoError, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
