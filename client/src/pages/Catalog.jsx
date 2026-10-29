import { useEffect, useMemo, useState } from 'react';
import { useData, useEvaluation } from '../context/DataContext';
import StatusBadge from '../components/StatusBadge';
import ProgramForm from '../components/ProgramForm';
import UniversityForm from '../components/UniversityForm';
import PageHeader from '../components/PageHeader';
import { PROGRAM_STATUSES, STATUS_META, countryLabel, describeRequirements, money } from '../lib/format';
import { ALL_FIELDS_META, FieldChip, fieldMeta } from '../lib/theme';

const SORTS = {
  fieldRank: { label: 'Oborový žebříček', key: (p) => p.fieldRank ?? 9999 },
  worldRank: { label: 'Světový žebříček', key: (p, u) => u?.worldRankSort ?? 9999 },
  margin: { label: 'Rezerva bodů', key: (p, u, r) => -(r?.margin ?? -99) },
  tuition: { label: 'Školné', key: (p) => p.tuitionFee ?? 1e9 },
  name: { label: 'Název univerzity', key: (p, u) => u?.name ?? '' },
  priority: { label: 'Moje priorita', key: (p) => p.priority ?? 9999 },
};

const STATUS_ORDER = { meets: 0, borderline: 1, unknown: 2, fails: 3 };

const STORAGE_KEY = 'lukas-catalog-filters';
function loadFilters() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

const compare = (a, b) => (typeof a === 'string' ? a.localeCompare(b) : a - b);

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
  const [editingUni, setEditingUni] = useState(null);

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
  const fieldsById = useMemo(() => new Map(catalog?.fields.map((f) => [f.id, f])), [catalog]);

  const inField = useMemo(
    () => (catalog?.programs ?? []).filter((p) => fieldId === 'all' || p.fieldId === fieldId),
    [catalog, fieldId],
  );

  // Programy jedné univerzity se zobrazí pohromadě (Bath má ve Sport Science 3 programy).
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorter = SORTS[sort] ?? SORTS.fieldRank;
    const byUni = new Map();
    for (const p of inField) {
      const u = unis.get(p.universityId);
      const r = evaluation.get(p.id);
      if (q && !`${u?.name} ${p.name} ${u?.city ?? ''}`.toLowerCase().includes(q)) continue;
      if (country && u?.country !== country) continue;
      if (statusFilter && r?.status !== statusFilter) continue;
      if (hideFails && r?.status === 'fails') continue;
      if (!byUni.has(p.universityId)) byUni.set(p.universityId, { u, items: [] });
      byUni.get(p.universityId).items.push({ p, r, key: sorter.key(p, u, r) });
    }
    const list = [...byUni.values()];
    for (const g of list) {
      g.items.sort((a, b) => STATUS_ORDER[a.r?.status] - STATUS_ORDER[b.r?.status] || compare(a.key, b.key));
      g.key = g.items.map((i) => i.key).sort(compare)[0];
      g.allFail = g.items.every((i) => i.r?.status === 'fails');
    }
    return list.sort((a, b) => compare(a.key, b.key));
  }, [inField, unis, evaluation, search, country, statusFilter, hideFails, sort]);

  const counts = useMemo(() => {
    const c = { meets: 0, borderline: 0, fails: 0, unknown: 0 };
    for (const p of inField) c[evaluation.get(p.id)?.status ?? 'unknown']++;
    return c;
  }, [inField, evaluation]);

  if (!catalog || !student) return null;
  const countries = [...new Set(catalog.universities.map((u) => u.country).filter(Boolean))].sort();
  const programCount = groups.reduce((n, g) => n + g.items.length, 0);

  const tab = (id, label, n, meta) => {
    const TabIcon = meta.icon;
    const active = fieldId === id;
    return (
      <button
        key={id}
        onClick={() => setFieldId(id)}
        className={`flex items-center gap-2 whitespace-nowrap rounded-lg border-2 px-3 py-2 text-sm transition ${active
          ? `${meta.solid} border-transparent font-semibold text-white shadow-sm`
          : `${meta.bg} ${meta.text} border-transparent hover:brightness-95`}`}
      >
        <TabIcon className="h-4 w-4" />
        {label}
        <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-white/25' : 'bg-white'}`}>{n}</span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        subtitle={(
          <>
            Vyhodnoceno podle scénáře{' '}
            <select className="rounded border border-slate-300 bg-white px-1 py-0.5 text-sm" value={scenario?.id ?? ''} onChange={(e) => setScenarioId(Number(e.target.value))}>
              {student.scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}{s.isActive ? ' (aktivní)' : ''}</option>)}
            </select>
          </>
        )}
        actions={<button className="btn-primary" onClick={() => setEditing('new')}>+ Program</button>}
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tab('all', 'Všechny obory', catalog.programs.length, ALL_FIELDS_META)}
        {catalog.fields.map((f) => tab(f.id, f.name, catalog.programs.filter((p) => p.fieldId === f.id).length, fieldMeta(f.name)))}
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_META).map(([k, m]) => (
          <button
            key={k}
            onClick={() => setStatusFilter(statusFilter === k ? '' : k)}
            className={`rounded-full border px-3 py-1 text-sm ${m.cls} ${statusFilter === k ? 'ring-2 ring-sky-500' : ''}`}
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
        <span className="ml-auto text-xs text-slate-500">{groups.length} univerzit · {programCount} programů</span>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="min-w-[11rem] px-3 py-2">Univerzita</th>
              <th className="px-3 py-2">Stav</th>
              <th className="min-w-[14rem] px-3 py-2">Program</th>
              <th className="px-3 py-2 text-right" title="Oborový žebříček UK">Žebř.</th>
              <th className="px-3 py-2 text-right">Školné</th>
              <th className="min-w-[14rem] px-3 py-2">Požadavky</th>
              <th className="px-3 py-2">Přihláška</th>
            </tr>
          </thead>
          {groups.map(({ u, items, allFail }) => (
            <tbody key={u?.id} className="border-t-2 border-slate-200">
              {items.map(({ p, r }, i) => {
                const failed = r?.status === 'fails';
                return (
                  <tr key={p.id} className={`align-top ${i > 0 ? 'border-t border-dashed border-slate-200' : ''} ${failed ? 'bg-slate-50 text-slate-400' : ''}`}>
                    {i === 0 && (
                      <td rowSpan={items.length} className="bg-white px-3 py-2">
                        <button
                          className={`text-left font-semibold hover:text-sky-700 hover:underline ${allFail ? 'text-slate-400 line-through' : 'text-slate-900'}`}
                          onClick={() => setEditingUni(u)}
                          title="Upravit univerzitu"
                        >
                          {u?.name}
                        </button>
                        <div className="mt-0.5 text-xs text-slate-500">{countryLabel(u?.country)} · {u?.city}</div>
                        {u?.worldRankText && <div className="text-xs text-slate-500">svět {u.worldRankText}</div>}
                        {items.length > 1 && <div className="mt-1 text-xs font-medium text-sky-700">{items.length} programy</div>}
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <StatusBadge result={r} />
                      {r?.category && <div className="mt-1 text-xs text-slate-500">{r.category}</div>}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        className={`text-left font-medium hover:text-sky-700 hover:underline ${failed ? 'line-through' : 'text-slate-800'}`}
                        onClick={() => setEditing(p)}
                        title="Upravit program"
                      >
                        {p.name}
                      </button>
                      {p.programUrl && <a href={p.programUrl} target="_blank" rel="noreferrer" className="ml-1 text-sky-600 hover:underline" title="Stránka programu">↗</a>}
                      {fieldId === 'all' && <div className="mt-1"><FieldChip name={fieldsById.get(p.fieldId)?.name} /></div>}
                      {r?.reasons?.length > 0 && r.status !== 'unknown' && (
                        <div className={`mt-1 text-xs ${failed ? 'text-red-600' : 'text-amber-700'}`}>{r.reasons.join(' · ')}</div>
                      )}
                      {r?.contextualMet && r.status !== 'meets' && <div className="mt-1 text-xs text-emerald-700">splňuje contextual offer</div>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{p.fieldRank ? `#${p.fieldRank}` : ''}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{money(p.tuitionFee, p.tuitionCurrency)}</td>
                    <td className="px-3 py-2 text-xs" title={p.requirementsText ?? ''}>
                      {i > 0 && describeRequirements(p) === describeRequirements(items[i - 1].p)
                        ? <span className="italic text-slate-400">↑ stejné jako výše</span>
                        : describeRequirements(p)}
                    </td>
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
            </tbody>
          ))}
          {!groups.length && (
            <tbody><tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">Žádný program neodpovídá filtru.</td></tr></tbody>
          )}
        </table>
      </div>

      {editing && (
        <ProgramForm
          program={editing === 'new' ? null : editing}
          defaultFieldId={fieldId === 'all' ? undefined : fieldId}
          onClose={() => setEditing(null)}
        />
      )}
      {editingUni && <UniversityForm university={editingUni} onClose={() => setEditingUni(null)} />}
    </div>
  );
}
