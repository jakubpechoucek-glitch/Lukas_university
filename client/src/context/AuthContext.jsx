import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

// Adresa Rozcestníku – po přihlášení tam nás vrátí s tokenem v #sso=…
export const ROZCESTNIK_SSO_URL = 'https://jakubpechoucek-glitch.github.io/rozcestnik/?sso=lukas';

// Token z Rozcestníku přichází v části adresy za # (neposílá se serveru
// v běžném požadavku). Hned ho z adresy odstraníme.
function takeSsoToken() {
  const m = window.location.hash.match(/(?:^#|&)sso=([^&]+)/);
  if (!m) return null;
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return decodeURIComponent(m[1]);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ssoError, setSsoError] = useState('');

  const loadUser = useCallback(async () => {
    const ssoToken = takeSsoToken();
    if (ssoToken) {
      try {
        const { data } = await api.post('/auth/supabase', { accessToken: ssoToken });
        localStorage.setItem('token', data.data.token);
        setUser(data.data.user);
        setLoading(false);
        return;
      } catch (err) {
        setSsoError(err.response?.data?.error || 'Přihlášení přes Rozcestník se nezdařilo');
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
