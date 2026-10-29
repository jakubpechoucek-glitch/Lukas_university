import { useLocation } from 'react-router-dom';
import { sectionFor } from '../lib/theme';

/** Nadpis stránky s barevnou ikonou sekce. */
export default function PageHeader({ title, subtitle, actions }) {
  const s = sectionFor(useLocation().pathname);
  const SectionIcon = s.icon;
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 rounded-xl p-2.5 text-white shadow-sm ${s.solid}`}><SectionIcon className="h-6 w-6" /></span>
        <div>
          <h1 className="text-2xl font-semibold">{title ?? s.label}</h1>
          {subtitle && <div className="text-sm text-slate-600">{subtitle}</div>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
