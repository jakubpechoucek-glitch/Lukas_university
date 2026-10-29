import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { evaluateProgram } from '@calc';
import { useAuth } from '../context/AuthContext';
import { useData, scenarioSubjects, scenarioTotals, useEvaluation } from '../context/DataContext';
import { STATUS_META, PROGRAM_STATUSES, formatDate } from '../lib/format';

function countMeets(programs, subjects, totals) {
  return programs.filter((p) => evaluateProgram(p, subjects, totals).status === 'meets').length;
}

export default function Home() {
  const { user } = useAuth();
  const { catalog, student, activeScenario } = useData();
  const evaluation = useEvaluation(activeScenario);

  // Co by udělalo zlepšení jednoho předmětu o 1 známku (nebo TOK+EE o 1 bod).
  const whatIf = useMemo(() => {
    if (!catalog || !student || !activeScenario) return [];
    const base = scenarioSubjects(student.subjects, activeScenario);
    const baseTotals = scenarioTotals(student.subjects, activeScenario);
    const baseCount = countMeets(catalog.programs, base, baseTotals);
    const options = student.subjects
      .filter((s) => (activeScenario.grades[s.id] ?? 0) < 7 && activeScenario.grades[s.id] !== null && activeScenario.grades[s.id] !== undefined)
      .map((s) => {
        const sc = { ...activeScenario, grades: { ...activeScenario.grades, [s.id]: activeScenario.grades[s.id] + 1 } };
        const subjects = scenarioSubjects(student.subjects, sc);
        return { label: `${s.displayName} ${s.level} ${activeScenario.grades[s.id]} → ${activeScenario.grades[s.id] + 1}`, gain: countMeets(catalog.programs, subjects, scenarioTotals(student.subjects, sc)) - baseCount };
      });
    if ((activeScenario.corePoints ?? 0) < 3) {
      const sc = { ...activeScenario, corePoints: (activeScenario.corePoints ?? 0) + 1 };
      options.push({ label: `TOK+EE ${activeScenario.corePoints ?? 0} → ${sc.corePoints}`, gain: countMeets(catalog.programs, base, scenarioTotals(student.subjects, sc)) - baseCount });
    }
    return options.sort((a, b) => b.gain - a.gain);
  }, [catalog, student, activeScenario]);

  if (!catalog || !student) return null;
  const totals = scenarioTotals(student.subjects, activeScenario);
  const upcoming = student.assessments
    .filter((a) => a.dueDate && a.grade === null)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);
  const tracked = catalog.programs.filter((p) => !['research', 'considering', 'dropped'].includes(p.status));
  const uni = (id) => catalog.universities.find((u) => u.id === id)?.name;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Ahoj, {user?.name}</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/predikce" className="card block hover:border-primary">
          <div className="text-xs uppercase tracking-wide text-slate-500">Aktivní scénář „{activeScenario?.name}“</div>
          <div className="mt-1 text-4xl font-semibold tabular-nums">{totals.total}<span className="text-lg text-slate-400"> / 45</span></div>
          <div className="text-sm text-slate-600">HL {totals.hlProfile.join('-')} · SL součet {totals.slSum}</div>
          {totals.diplomaIssues.length > 0 && <div className="mt-1 text-sm text-red-600">Diplom: {totals.diplomaIssues.join(', ')}</div>}
        </Link>

        <Link to="/katalog" className="card block hover:border-primary md:col-span-2">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Dosažitelnost podle oboru</div>
          <table className="w-full text-sm">
            <tbody>
              {catalog.fields.map((f) => {
                const ps = catalog.programs.filter((p) => p.fieldId === f.id);
                const c = (st) => ps.filter((p) => evaluation.get(p.id)?.status === st).length;
                return (
                  <tr key={f.id}>
                    <td className="py-0.5">{f.name}</td>
                    {['meets', 'borderline', 'fails', 'unknown'].map((st) => (
                      <td key={st} className="w-14 text-right tabular-nums" title={STATUS_META[st].label}>{STATUS_META[st].icon} {c(st)}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold">Kde se vyplatí přidat</h2>
          <p className="mb-2 text-xs text-slate-500">O kolik programů víc by Lukas splňoval, kdyby se zlepšil o jednu známku.</p>
          <ul className="space-y-1 text-sm">
            {whatIf.map((w) => (
              <li key={w.label} className="flex items-center gap-2">
                <span className="w-48 shrink-0">{w.label}</span>
                <span className="h-2 rounded bg-primary" style={{ width: `${Math.max(2, w.gain * 4)}px` }} />
                <span className="tabular-nums text-slate-600">+{w.gain}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card space-y-4">
          <div>
            <h2 className="mb-2 font-semibold">Nadcházející termíny</h2>
            {upcoming.length ? (
              <ul className="space-y-1 text-sm">
                {upcoming.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <span className="w-24 shrink-0 tabular-nums text-slate-600">{formatDate(a.dueDate)}</span>
                    <span className="text-slate-500">{student.subjects.find((s) => s.id === a.subjectId)?.displayName}</span>
                    <span>{a.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Žádné termíny – doplňte je u assessmentů v <Link className="text-primary hover:underline" to="/predmety">Předmětech</Link>.</p>
            )}
          </div>
          {tracked.length > 0 && (
            <div>
              <h2 className="mb-2 font-semibold">Přihlášky</h2>
              <ul className="space-y-1 text-sm">
                {tracked.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2">
                    <span>{uni(p.universityId)} – {p.name}</span>
                    <span className="whitespace-nowrap text-slate-500">{PROGRAM_STATUSES[p.status]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
