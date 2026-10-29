import { useMemo, useState } from 'react';
import { evaluateProgram } from '@calc';
import { useData, scenarioSubjects, scenarioTotals } from '../context/DataContext';
import StatusBadge from '../components/StatusBadge';
import { STATUS_META } from '../lib/format';

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Matice scénářů</h1>
        <p className="text-sm text-slate-600">Které programy se otevřou, když se Lukas zlepší. Najetím na ikonu se zobrazí důvod.</p>
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-slate-600">
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={onlyChanging} onChange={(e) => setOnlyChanging(e.target.checked)} /> jen programy, kde se výsledek mezi scénáři liší</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={hideUnknown} onChange={(e) => setHideUnknown(e.target.checked)} /> skrýt nevyhodnotitelné</label>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left uppercase tracking-wide">Program</th>
              {scenarios.map((sc) => (
                <th key={sc.id} className={`min-w-[6rem] px-2 py-2 text-center ${sc.isActive ? 'text-primary' : ''}`}>
                  <div className="text-sm font-semibold normal-case">{sc.name}</div>
                  <div className="font-normal tabular-nums">{scenarioTotals(student.subjects, sc).total} b.</div>
                  <div className="font-normal">{STATUS_META.meets.icon} {total(scenarios.indexOf(sc), 'meets')} · {STATUS_META.borderline.icon} {total(scenarios.indexOf(sc), 'borderline')}</div>
                </th>
              ))}
            </tr>
          </thead>
          {catalog.fields.map((f) => {
            const programs = catalog.programs.filter((p) => p.fieldId === f.id && visible(p));
            if (!programs.length) return null;
            return (
              <tbody key={f.id}>
                <tr className="bg-slate-100/70">
                  <td colSpan={scenarios.length + 1} className="sticky left-0 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">{f.name}</td>
                </tr>
                {programs.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="sticky left-0 z-10 max-w-[16rem] bg-white px-3 py-1.5">
                      <div className="truncate font-medium" title={unis.get(p.universityId)?.name}>{unis.get(p.universityId)?.name}</div>
                      <div className="truncate text-xs text-slate-500" title={p.name}>{p.name}</div>
                    </td>
                    {results.map((r, i) => (
                      <td key={scenarios[i].id} className="px-2 py-1.5 text-center"><StatusBadge result={r.get(p.id)} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}
