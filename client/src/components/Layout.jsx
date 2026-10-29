import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SECTIONS, sectionFor } from '../lib/theme';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const current = sectionFor(useLocation().pathname);
  const CurrentIcon = current.icon;

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      {/* Spodní okraj hlavičky má barvu aktuální sekce – na první pohled je vidět, kde jsem. */}
      <header className={`sticky top-0 z-30 border-b-4 bg-white/95 backdrop-blur ${current.border}`}>
        <div className="mx-auto flex max-w-6xl items-center gap-x-6 gap-y-2 px-4 py-2">
          <span className="font-semibold text-slate-900">Lukas University</span>

          {/* Desktop: navigace nahoře */}
          <nav className="hidden gap-1 text-sm sm:flex">
            {SECTIONS.map((s) => {
              const SectionIcon = s.icon;
              return (
                <NavLink
                  key={s.to}
                  to={s.to}
                  end={s.end}
                  className={({ isActive }) => `flex items-center gap-1.5 rounded-lg px-3 py-2 transition ${isActive
                    ? `${s.bg} ${s.text} font-semibold ring-1 ${s.ring}`
                    : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {({ isActive }) => (
                    <>
                      <SectionIcon className={`h-4 w-4 ${isActive ? '' : s.text}`} />
                      {s.short}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Mobil: název aktuální sekce */}
          <span className={`flex items-center gap-1.5 text-sm font-semibold sm:hidden ${current.text}`}>
            <CurrentIcon className="h-4 w-4" />{current.short}
          </span>

          <div className="ml-auto flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden sm:inline">{user?.name}</span>
            <button onClick={logout} className="text-slate-500 hover:text-slate-900">Odhlásit</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      {/* Mobil: spodní lišta s ikonami */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden">
        {SECTIONS.map((s) => {
          const SectionIcon = s.icon;
          return (
            <NavLink
              key={s.to}
              to={s.to}
              end={s.end}
              className={({ isActive }) => `relative flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? `${s.text} font-semibold` : 'text-slate-500'}`}
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className={`absolute inset-x-3 top-0 h-1 rounded-b ${s.solid}`} />}
                  <span className={`rounded-full p-1 ${isActive ? s.bg : ''}`}><SectionIcon className="h-5 w-5" /></span>
                  {s.short}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
