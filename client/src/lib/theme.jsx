// Barvy a ikony sekcí aplikace a studijních oborů – jedno místo pro celé UI.
// Třídy Tailwindu musí být napsané celé (ne skládané), aby je build našel.

function Icon({ children, className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

export const Icons = {
  home: (p) => <Icon {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></Icon>,
  catalog: (p) => <Icon {...p}><path d="M3 21h18" /><path d="M5 21V10M9.5 21V10M14.5 21V10M19 21V10" /><path d="M2.5 10 12 4l9.5 6z" /></Icon>,
  target: (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></Icon>,
  book: (p) => <Icon {...p}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /><path d="M8 7h8M8 11h6" /></Icon>,
  grid: (p) => <Icon {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></Icon>,
  // obory
  running: (p) => <Icon {...p}><circle cx="14" cy="4" r="2" /><path d="M10.5 20.5 13 15l-3-3 2.5-4.5L16 10l3 1" /><path d="M7 12.5 9.5 8h3" /><path d="m13 15 3 2 1 4" /></Icon>,
  trophy: (p) => <Icon {...p}><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" /><path d="M12 14v4M8 21h8M9.5 18h5" /></Icon>,
  heart: (p) => <Icon {...p}><path d="M20.5 8.5c0 5-8.5 11-8.5 11s-8.5-6-8.5-11A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8.5 2.5z" /><path d="M3.5 12h4l2-3 3 6 2-3h6" /></Icon>,
  briefcase: (p) => <Icon {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M3 13h18" /></Icon>,
  layers: (p) => <Icon {...p}><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></Icon>,
};

export const SECTIONS = [
  {
    to: '/', end: true, label: 'Přehled', short: 'Přehled', icon: Icons.home,
    text: 'text-indigo-700', bg: 'bg-indigo-50', solid: 'bg-indigo-600', border: 'border-indigo-600', ring: 'ring-indigo-200',
  },
  {
    to: '/katalog', label: 'Katalog škol', short: 'Katalog', icon: Icons.catalog,
    text: 'text-sky-700', bg: 'bg-sky-50', solid: 'bg-sky-600', border: 'border-sky-600', ring: 'ring-sky-200',
  },
  {
    to: '/predikce', label: 'Predikce IB', short: 'Predikce', icon: Icons.target,
    text: 'text-violet-700', bg: 'bg-violet-50', solid: 'bg-violet-600', border: 'border-violet-600', ring: 'ring-violet-200',
  },
  {
    to: '/predmety', label: 'Předměty a assessmenty', short: 'Předměty', icon: Icons.book,
    text: 'text-emerald-700', bg: 'bg-emerald-50', solid: 'bg-emerald-600', border: 'border-emerald-600', ring: 'ring-emerald-200',
  },
  {
    to: '/matice', label: 'Matice scénářů', short: 'Matice', icon: Icons.grid,
    text: 'text-amber-700', bg: 'bg-amber-50', solid: 'bg-amber-500', border: 'border-amber-500', ring: 'ring-amber-200',
  },
];

export function sectionFor(pathname) {
  return SECTIONS.find((s) => (s.end ? pathname === s.to : pathname.startsWith(s.to))) ?? SECTIONS[0];
}

const FIELD_META = {
  'Sport Science': { icon: Icons.running, text: 'text-orange-700', bg: 'bg-orange-50', solid: 'bg-orange-500', border: 'border-orange-300' },
  'Sport Management': { icon: Icons.trophy, text: 'text-teal-700', bg: 'bg-teal-50', solid: 'bg-teal-600', border: 'border-teal-300' },
  Physiotherapy: { icon: Icons.heart, text: 'text-rose-700', bg: 'bg-rose-50', solid: 'bg-rose-600', border: 'border-rose-300' },
  'Business Management': { icon: Icons.briefcase, text: 'text-blue-700', bg: 'bg-blue-50', solid: 'bg-blue-600', border: 'border-blue-300' },
};

const FIELD_FALLBACK = { icon: Icons.layers, text: 'text-slate-700', bg: 'bg-slate-100', solid: 'bg-slate-600', border: 'border-slate-300' };

export const ALL_FIELDS_META = { icon: Icons.layers, text: 'text-slate-700', bg: 'bg-slate-100', solid: 'bg-slate-700', border: 'border-slate-300' };

export const fieldMeta = (name) => FIELD_META[name] ?? FIELD_FALLBACK;

/** Malý barevný štítek oboru s ikonou. */
export function FieldChip({ name, className = '' }) {
  const m = fieldMeta(name);
  const FieldIcon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${m.bg} ${m.text} ${className}`}>
      <FieldIcon className="h-3.5 w-3.5" />{name}
    </span>
  );
}
