import { useMemo, useState } from 'react';
import { evaluateProgram } from '@calc';
import { useData, scenarioSubjects, scenarioTotals } from '../context/DataContext';
import StatusBadge from '../components/StatusBadge';
import PageHeader from '../components/PageHeader';
import { STATUS_META } from '../lib/format';
import { fieldMeta } from '../lib/theme';

export default function Matrix() {
  const { catalog, student } = useData();
  const [onlyChanging, setOnlyChanging] = useState(true);
  const [hideUnknown, setHideUnknown] = useState(true);

  const results = useMemo(() => {
    if (!catalog || !student) return null;
    return student.scenarios.map((sc) => {
      const subjects = scenarioSubjects(student.subjects, sc);
      const totals = scenarioTotals(student.subjects, sc);
      return new Map(catalog.programs.map((p) => [p.id, evaluateProgram(p, subjects, totals)]));
    });
  }, [catalog, student]);

  if (!results) return null;
  const { scenarios } = student;
  const unis = new Map(catalog.universities.map((u) => [u.id, u]));

  const visible = (p) => {
    const statuses = results.map((r) => r.get(p.id).status);
    if (hideUnknown && statuses.every((s) => s === 'unknown')) return false;
    if (onlyChanging && new Set(statuses).size === 1) return false;
    return true;
  };

  const total = (i, status) => catalog.programs.filter((p) => results[i].get(p.id).status === status).length;

  // Programy jednoho oboru seskupené podle univerzity (název univerzity jen jednou).
  const grouped = (fieldId) => {
    const byUni = new Map();
    for (const p of catalog.programs) {
      if (p.fieldId !== fieldId || !visible(p)) continue;
      if (!byUni.has(p.universityId)) byUni.set(p.universityId, []);
      byUni.get(p.universityId).push(p);
    }
    return [...byUni.entries()].map(([uid, programs]) => ({ u: unis.get(uid), programs }));
  };

  return (
    <div className="space-y-4">
      <PageHeader subtitle="Které programy se otevřou, když se Lukas zlepší. Najetím na ikonu se zobrazí důvod." />
      <div className="flex flex-wrap gap-4 text-sm text-slate-600">
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={onlyChanging} onChange={(e) => setOnlyChanging(e.target.checked)} /> jen programy, kde se výsledek mezi scénáři liší</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={hideUnknown} onChange={(e) => setHideUnknown(e.target.checked)} /> skrýt nevyhodnotitelné</label>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-amber-50/60 text-xs text-slate-500">
            <tr>
              <th className="sticky left-0 z-10 bg-amber-50 px-3 py-2 text-left uppercase tracking-wide">Univerzita</th>
              <th className="px-3 py-2 text-left uppercase tracking-wide">Program</th>
              {scenarios.map((sc, i) => (
                <th key={sc.id} className={`min-w-[6rem] px-2 py-2 text-center ${sc.isActive ? 'bg-violet-50 text-violet-700' : ''}`}>
                  <div className="text-sm font-semibold normal-case">{sc.name}</div>
                  <div className="font-normal tabular-nums">{scenarioTotals(student.subjects, sc).total} b.</div>
                  <div className="font-normal">{STATUS_META.meets.icon} {total(i, 'meets')} · {STATUS_META.borderline.icon} {total(i, 'borderline')}</div>
                </th>
              ))}
            </tr>
          </thead>
          {catalog.fields.map((f) => {
            const groups = grouped(f.id);
            if (!groups.length) return null;
            const m = fieldMeta(f.name);
            const FieldIcon = m.icon;
            return (
              <tbody key={f.id}>
                <tr className={m.bg}>
                  <td colSpan={scenarios.length + 2} className={`sticky left-0 px-3 py-2 text-sm font-semibold ${m.text}`}>
                    <span className="inline-flex items-center gap-1.5"><FieldIcon className="h-4 w-4" />{f.name}</span>
                  </td>
                </tr>
                {groups.flatMap(({ u, programs }) => programs.map((p, i) => (
                  <tr key={p.id} className={i === 0 ? 'border-t border-slate-200' : 'border-t border-dashed border-slate-100'}>
                    {i === 0 && (
                      <td rowSpan={programs.length} className="sticky left-0 z-10 max-w-[12rem] bg-white px-3 py-1.5 align-top font-medium">
                        <div className="truncate" title={u?.name}>{u?.name}</div>
                      </td>
                    )}
                    <td className="max-w-[16rem] px-3 py-1.5 text-xs text-slate-600"><div className="truncate" title={p.name}>{p.name}</div></td>
                    {results.map((r, j) => (
                      <td key={scenarios[j].id} className={`px-2 py-1.5 text-center ${scenarios[j].isActive ? 'bg-violet-50/50' : ''}`}><StatusBadge result={r.get(p.id)} /></td>
                    ))}
                  </tr>
                )))}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}
