import { SUBJECT_CODES, SUBJECT_GROUPS } from '@calc';

const SUBJECT_OPTIONS = [
  ...Object.keys(SUBJECT_GROUPS).map((code) => ({ code, label: `${code} (${SUBJECT_GROUPS[code].join(', ')})`, group: true })),
  ...Object.entries(SUBJECT_CODES).map(([code, label]) => ({ code, label: `${code} – ${label}` })),
];

const emptyRule = () => ({ subjects: [], level: 'HL', minGrade: 5, count: 1, note: '' });
export const emptySet = () => ({
  label: '', kind: 'typical', minTotal: null, totalBasis: 'with_core', hlProfile: null,
  minHlSum: null, minEachSubject: null, requiresFullDiploma: true, subjectRules: [],
});

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

function NumberField({ label, value, onChange, min, max, className = 'w-20' }) {
  return (
    <label className="text-xs text-slate-600">
      {label}
      <input type="number" min={min} max={max} className={`input mt-0.5 py-1 ${className}`} value={value ?? ''} onChange={(e) => onChange(num(e.target.value))} />
    </label>
  );
}

function SubjectPicker({ value, onChange }) {
  const toggle = (code) => onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);
  return (
    <div className="flex flex-wrap gap-1">
      {SUBJECT_OPTIONS.map((o) => (
        <button
          type="button"
          key={o.code}
          title={o.label}
          onClick={() => toggle(o.code)}
          className={`rounded-full border px-2 py-0.5 text-xs ${value.includes(o.code)
            ? 'border-primary bg-primary text-white'
            : `border-slate-300 ${o.group ? 'bg-slate-100 font-medium' : 'bg-white'} text-slate-700 hover:border-primary`}`}
        >
          {o.code}
        </button>
      ))}
    </div>
  );
}

function RuleEditor({ rule, onChange, onRemove }) {
  const set = (patch) => onChange({ ...rule, ...patch });
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-slate-600">
          Úroveň
          <select className="input mt-0.5 w-24 py-1" value={rule.level} onChange={(e) => set({ level: e.target.value })}>
            <option value="HL">HL</option>
            <option value="SL">SL</option>
            <option value="ANY">HL i SL</option>
          </select>
        </label>
        <NumberField label="Min. známka" value={rule.minGrade} min={1} max={7} onChange={(minGrade) => set({ minGrade })} />
        <NumberField label="Počet předmětů" value={rule.count} min={1} max={6} onChange={(count) => set({ count: count ?? 1 })} />
        <label className="min-w-[10rem] flex-1 text-xs text-slate-600">
          Poznámka
          <input className="input mt-0.5 py-1" value={rule.note ?? ''} onChange={(e) => set({ note: e.target.value })} />
        </label>
        <button type="button" className="pb-1.5 text-xs text-red-600 hover:underline" onClick={onRemove}>odebrat</button>
      </div>
      <SubjectPicker value={rule.subjects} onChange={(subjects) => set({ subjects })} />
    </div>
  );
}

function SetEditor({ index, set, onChange, onRemove }) {
  const patch = (p) => onChange({ ...set, ...p });
  const profile = set.hlProfile ?? [];
  const setProfile = (i, v) => {
    const next = [0, 1, 2].map((j) => (j === i ? v : profile[j] ?? null));
    patch({ hlProfile: next.every((x) => x === null) ? null : next.map((x) => x ?? 1) });
  };
  return (
    <div className={`space-y-3 rounded-lg border p-3 ${set.kind === 'contextual' ? 'border-dashed border-slate-300' : 'border-slate-300'}`}>
      <div className="flex flex-wrap items-end gap-2">
        <span className="pb-1.5 text-sm font-semibold">{index > 0 ? 'NEBO ' : ''}Sada {index + 1}</span>
        <label className="min-w-[8rem] flex-1 text-xs text-slate-600">
          Popisek
          <input className="input mt-0.5 py-1" value={set.label ?? ''} placeholder="Typical offer" onChange={(e) => patch({ label: e.target.value })} />
        </label>
        <label className="text-xs text-slate-600">
          Druh
          <select className="input mt-0.5 py-1" value={set.kind} onChange={(e) => patch({ kind: e.target.value })}>
            <option value="typical">typical (počítá se)</option>
            <option value="contextual">contextual (jen info)</option>
          </select>
        </label>
        <button type="button" className="pb-1.5 text-xs text-red-600 hover:underline" onClick={onRemove}>smazat sadu</button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <NumberField label="Celkové skóre ≥" value={set.minTotal} min={0} max={45} onChange={(minTotal) => patch({ minTotal })} />
        <label className="text-xs text-slate-600">
          Počítá se
          <select className="input mt-0.5 py-1" value={set.totalBasis} onChange={(e) => patch({ totalBasis: e.target.value })}>
            <option value="with_core">včetně TOK/EE (45)</option>
            <option value="subjects_only">jen předměty (42)</option>
          </select>
        </label>
        <div className="text-xs text-slate-600">
          HL profil
          <div className="mt-0.5 flex gap-1">
            {[0, 1, 2].map((i) => (
              <input key={i} type="number" min={1} max={7} aria-label={`HL profil ${i + 1}`} className="input w-12 px-1 py-1 text-center" value={profile[i] ?? ''} onChange={(e) => setProfile(i, num(e.target.value))} />
            ))}
          </div>
        </div>
        <NumberField label="Součet HL ≥" value={set.minHlSum} min={0} max={21} onChange={(minHlSum) => patch({ minHlSum })} />
        <NumberField label="Každý předmět ≥" value={set.minEachSubject} min={1} max={7} onChange={(minEachSubject) => patch({ minEachSubject })} />
        <label className="flex items-center gap-1.5 pb-2 text-xs text-slate-600">
          <input type="checkbox" checked={set.requiresFullDiploma} onChange={(e) => patch({ requiresFullDiploma: e.target.checked })} />
          plný diplom
        </label>
      </div>
      <div className="space-y-2">
        {set.subjectRules.map((r, i) => (
          <RuleEditor
            key={i}
            rule={r}
            onChange={(rule) => patch({ subjectRules: set.subjectRules.map((x, j) => (j === i ? rule : x)) })}
            onRemove={() => patch({ subjectRules: set.subjectRules.filter((_, j) => j !== i) })}
          />
        ))}
        <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => patch({ subjectRules: [...set.subjectRules, emptyRule()] })}>
          + podmínka na předmět
        </button>
      </div>
    </div>
  );
}

export default function RequirementEditor({ sets, onChange }) {
  return (
    <div className="space-y-3">
      {sets.map((s, i) => (
        <SetEditor
          key={i}
          index={i}
          set={s}
          onChange={(set) => onChange(sets.map((x, j) => (j === i ? set : x)))}
          onRemove={() => onChange(sets.filter((_, j) => j !== i))}
        />
      ))}
      <button type="button" className="btn-secondary" onClick={() => onChange([...sets, emptySet()])}>+ Sada požadavků</button>
      <p className="text-xs text-slate-500">Sady platí jako „NEBO“ (stačí splnit jednu), podmínky uvnitř sady musí platit všechny. Skupiny: SCIENCE, MATH, ENGLISH.</p>
    </div>
  );
}
