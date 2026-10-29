const GRADES = [1, 2, 3, 4, 5, 6, 7];

/** Výběr známky (prázdná hodnota = bez známky). Na mobilu se otevře nativní výběr. */
export default function GradeSelect({ value, onChange, options = GRADES, className = '', label }) {
  return (
    <select
      aria-label={label}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      className={`rounded-md border border-slate-300 bg-white px-1.5 py-1 text-center text-sm tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${className}`}
    >
      <option value="">–</option>
      {options.map((g) => <option key={g} value={g}>{g}</option>)}
    </select>
  );
}
