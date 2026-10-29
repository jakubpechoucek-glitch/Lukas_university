import { useEffect, useMemo, useState } from 'react';
import { useData, useEvaluation } from '../context/DataContext';
import StatusBadge from '../components/StatusBadge';
import ProgramForm from '../components/ProgramForm';
import { PROGRAM_STATUSES, STATUS_META, countryLabel, describeRequirements, money } from '../lib/format';

const SORTS = {
  fieldRank: { label: 'Oborový žebříček', key: (p) => p.fieldRank ?? 9999 },
  worldRank: { label: 'Světový žebříček', key: (p, u) => u?.worldRankSort ?? 9999 },
  margin: { label: 'Rezerva bodů', key: (p, u, r) => -(r?.margin ?? -99) },
  tuition: { label: 'Školné', key: (p) => p.tuitionFee ?? 1e9 },
  name: { label: 'Název univerzity', key: (p, u) => u?.name ?? '' },
  priority: { label: 'Moje priorita', key: (p) => p.priority ?? 9999 },
};

const STORAGE_KEY = 'lukas-catalog-filters';
function loadFilters() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

export default function Catalog() {
  const { catalog, student, activeScenario, updateProgramField } = useData();
  const saved = useMemo(loadFilters, []);
  const [fieldId, setFieldId] = useState(saved.fieldId ?? 'all');
  const [scenarioId, setScenarioId] = useState(null);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState(saved.country ?? '');
  const [statusFilter, setStatusFilter] = useState(saved.statusFilter ?? '');
  const [hideFails, setHideFails] = useState(saved.hideFails ?? false);
  const [sort, setSort] = useState(saved.sort ?? 'fieldRank');
  const [editing, setEditing] = useState(null); // null | 'new' | program

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ fieldId, country, statusFilter, hideFails, sort }));
    } catch {
      /* úložiště nemusí být dostupné */
    }
  }, [fieldId, country, statusFilter, hideFails, sort]);

  const scenario = student?.scenarios.find((s) => s.id === scenarioId) ?? activeScenario;
  const evaluation = useEvaluation(scenario);
  const unis = useMemo(() => new Map(catalog?.universities.map((u) => [u.id, u])), [catalog]);

  const inField = useMemo(
    () => (catalog?.programs ?? []).filter((p) => fieldId === 'all' || p.fieldId === fieldId),
    [catalog, fieldId],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorter = SORTS[sort] ?? SORTS.fieldRank;
    return inField
      .filter((p) => {
        const u = unis.get(p.universityId);
        const r = evaluation.get(p.id);
        if (q && !`${u?.name} ${p.name} ${u?.city ?? ''}`.toLowerCase().includes(q)) return false;
        if (country && u?.country !== country) return false;
        if (statusFilter && r?.status !== statusFilter) return false;
        if (hideFails && r?.status === 'fails') return false;
        return true;
      })
      .map((p) => ({ p, u: unis.get(p.universityId), r: evaluation.get(p.id) }))
      .sort((a, b) => {
        const ka = sorter.key(a.p, a.u, a.r);
        const kb = sorter.key(b.p, b.u, b.r);
        return typeof ka === 'string' ? ka.localeCompare(kb) : ka - kb;
      });
  }, [inField, unis, evaluation, search, country, statusFilter, hideFails, sort]);

  const counts = useMemo(() => {
    const c = { meets: 0, borderline: 0, fails: 0, unknown: 0 };
    for (const p of inField) c[evaluation.get(p.id)?.status ?? 'unknown']++;
    return c;
  }, [inField, evaluation]);

  if (!catalog || !student) return null;
  const countries = [...new Set(catalog.universities.map((u) => u.country).filter(Boolean))].sort();

  const tab = (id, label, n) => (
    <button
      key={id}
      onClick={() => setFieldId(id)}
      className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${fieldId === id ? 'bg-primary text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
    >
      {label} <span className="opacity-70">{n}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Katalog škol</h1>
          <p className="text-sm text-slate-600">
            Vyhodnoceno podle scénáře{' '}
            <select className="rounded border border-slate-300 bg-white px-1 py-0.5 text-sm" value={scenario?.id ?? ''} onChange={(e) => setScenarioId(Number(e.target.value))}>
              {student.scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}{s.isActive ? ' (aktivní)' : ''}</option>)}
            </select>
          </p>
        </div>
        <button className="btn-primary" onClick={() => setEditing('new')}>+ Program</button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {tab('all', 'Vše', catalog.programs.length)}
        {catalog.fields.map((f) => tab(f.id, f.name, catalog.programs.filter((p) => p.fieldId === f.id).length))}
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_META).map(([k, m]) => (
          <button
            key={k}
            onClick={() => setStatusFilter(statusFilter === k ? '' : k)}
            className={`rounded-full border px-3 py-1 text-sm ${m.cls} ${statusFilter === k ? 'ring-2 ring-primary' : ''}`}
          >
            {m.icon} {m.label} <b>{counts[k]}</b>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <input className="input w-full sm:w-64" placeholder="Hledat univerzitu, program, město…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input w-auto" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">Všechny země</option>
          {countries.map((c) => <option key={c} value={c}>{countryLabel(c)}</option>)}
        </select>
        <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
          {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>Řadit: {s.label}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-slate-600">
          <input type="checkbox" checked={hideFails} onChange={(e) => setHideFails(e.target.checked)} />
          skrýt nedosažitelné
        </label>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Stav</th>
              <th className="px-3 py-2">Univerzita / program</th>
              <th className="px-3 py-2">Země</th>
              <th className="px-3 py-2 text-right" title="Oborový žebříček UK / světový žebříček">Žebříček</th>
              <th className="px-3 py-2 text-right">Školné</th>
              <th className="min-w-[14rem] px-3 py-2">Požadavky</th>
              <th className="px-3 py-2">Přihláška</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, u, r }) => {
              const failed = r?.status === 'fails';
              return (
                <tr key={p.id} className={`border-t border-slate-100 align-top ${failed ? 'bg-slate-50 text-slate-400' : ''}`}>
                  <td className="px-3 py-2">
                    <StatusBadge result={r} />
                    {r?.category && <div className="mt-1 text-xs text-slate-500">{r.category}</div>}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      className={`text-left font-medium hover:text-primary hover:underline ${failed ? 'text-slate-400 line-through' : 'text-slate-900'}`}
                      onClick={() => setEditing(p)}
                    >
                      {u?.name}
                    </button>
                    <div className={failed ? 'line-through' : 'text-slate-600'}>
                      {p.programUrl ? <a href={p.programUrl} target="_blank" rel="noreferrer" className="hover:underline">{p.name} ↗</a> : p.name}
                    </div>
                    {fieldId === 'all' && <div className="text-xs text-slate-400">{catalog.fields.find((f) => f.id === p.fieldId)?.name}</div>}
                    {r?.reasons?.length > 0 && r.status !== 'unknown' && (
                      <div className={`mt-1 text-xs ${failed ? 'text-red-600' : 'text-amber-700'}`}>{r.reasons.join(' · ')}</div>
                    )}
                    {r?.contextualMet && r.status !== 'meets' && <div className="mt-1 text-xs text-emerald-700">splňuje contextual offer</div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{countryLabel(u?.country)}<div className="text-xs text-slate-500">{u?.city}</div></td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {p.fieldRank ? `#${p.fieldRank}` : ''}
                    <div className="text-xs text-slate-500">{u?.worldRankText ? `svět ${u.worldRankText}` : ''}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{money(p.tuitionFee, p.tuitionCurrency)}</td>
                  <td className="px-3 py-2 text-xs" title={p.requirementsText ?? ''}>{describeRequirements(p)}</td>
                  <td className="px-3 py-2">
                    <select
                      aria-label="Stav přihlášky"
                      className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs text-slate-700"
                      value={p.status}
                      onChange={(e) => updateProgramField(p.id, { status: e.target.value })}
                    >
                      {Object.entries(PROGRAM_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">Žádný program neodpovídá filtru.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <ProgramForm
          program={editing === 'new' ? null : editing}
          defaultFieldId={fieldId === 'all' ? undefined : fieldId}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
