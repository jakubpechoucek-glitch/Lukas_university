import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/', label: 'Přehled', end: true },
  { to: '/katalog', label: 'Katalog' },
  { to: '/predikce', label: 'Predikce' },
  { to: '/predmety', label: 'Předměty' },
  { to: '/matice', label: 'Matice' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-semibold text-primary">Lukas University</span>
          <nav className="flex flex-wrap gap-1 text-sm">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 ${isActive ? 'bg-primary-light font-medium text-primary' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-600">
            <span>{user?.name}</span>
            <button onClick={logout} className="text-slate-500 hover:text-slate-900">Odhlásit</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
