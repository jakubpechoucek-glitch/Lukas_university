import { useMemo, useState } from 'react';
import { evaluateProgram, weightedAverage, yearAverage } from '@calc';
import { useData, scenarioSubjects, scenarioTotals } from '../context/DataContext';
import GradeSelect from '../components/GradeSelect';
import { STATUS_META, TERMS } from '../lib/format';
import PageHeader from '../components/PageHeader';

const CORE_OPTIONS = [0, 1, 2, 3];

/** Aktuální vážený průměr předmětu přes všechna pololetí (null, když není žádná známka). */
export function subjectAverage(assessments, subjectId) {
  const terms = TERMS.map((term) => ({
    term,
    average: weightedAverage(assessments.filter((a) => a.subjectId === subjectId && a.term === term)).average,
  }));
  return yearAverage(terms);
}

function ScenarioHeader({ scenario, canDelete, onRename, onActivate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(scenario.name);
  const commit = () => {
    setEditing(false);
    if (name.trim() && name.trim() !== scenario.name) onRename(name.trim());
    else setName(scenario.name);
  };
  return (
    <th className={`min-w-[7.5rem] px-2 py-2 align-top text-center ${scenario.isActive ? 'bg-violet-50 text-violet-800' : ''}`}>
      {editing ? (
        <input
          autoFocus
          className="input px-1 py-0.5 text-center text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
        />
      ) : (
        <button className="font-medium hover:underline" title="Přejmenovat" onClick={() => setEditing(true)}>{scenario.name}</button>
      )}
      <div className="mt-1 flex items-center justify-center gap-2 text-xs font-normal">
        <label className="flex cursor-pointer items-center gap-1 text-slate-600" title="Podle aktivního scénáře se vyhodnocuje katalog">
          <input type="radio" name="active-scenario" checked={scenario.isActive} onChange={onActivate} />
          aktivní
        </label>
        {canDelete && (
          <button className="text-slate-400 hover:text-red-600" title="Smazat scénář" onClick={onDelete}>✕</button>
        )}
      </div>
    </th>
  );
}

export default function Prediction() {
  const { student, catalog, updateScenario, createScenario, activateScenario, deleteScenario, activeScenario } = useData();

  const averages = useMemo(() => (student
    ? Object.fromEntries(student.subjects.map((s) => [s.id, subjectAverage(student.assessments, s.id)]))
    : {}), [student]);

  const summaries = useMemo(() => {
    if (!student || !catalog) return {};
    return Object.fromEntries(student.scenarios.map((sc) => {
      const subjects = scenarioSubjects(student.subjects, sc);
      const totals = scenarioTotals(student.subjects, sc);
      const counts = { meets: 0, borderline: 0, fails: 0, unknown: 0 };
      for (const p of catalog.programs) counts[evaluateProgram(p, subjects, totals).status]++;
      return [sc.id, { totals, counts }];
    }));
  }, [student, catalog]);

  if (!student || !catalog) return null;
  const { subjects, scenarios } = student;

  async function addScenario(fromAverages) {
    const name = window.prompt('Název nového scénáře', fromAverages ? 'podle průměrů' : `kopie – ${activeScenario?.name ?? ''}`);
    if (!name) return;
    const sc = await createScenario(name.trim(), fromAverages ? null : activeScenario?.id);
    if (fromAverages) {
      // Známky = zaokrouhlené vážené průměry, body TOK+EE se převezmou z aktivního scénáře.
      const grades = Object.fromEntries(subjects.map((s) => [s.id, averages[s.id] === null ? null : Math.round(averages[s.id])]));
      await updateScenario(sc.id, { grades, corePoints: activeScenario?.corePoints ?? null });
    }
  }

  const rowCls = 'border-t border-slate-100';
  const stickyCls = 'sticky left-0 z-10 bg-white';

  return (
    <div className="space-y-4">
      <PageHeader
        subtitle="Změna známky se hned uloží a přepočítá. Aktivní scénář určuje vyhodnocení v katalogu."
        actions={(
          <>
            <button className="btn-secondary" onClick={() => addScenario(false)}>+ Kopie aktivního scénáře</button>
            <button className="btn-secondary" onClick={() => addScenario(true)} title="Známky = zaokrouhlené vážené průměry z assessmentů">+ Scénář z průměrů</button>
          </>
        )}
      />

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-600">
              <th className={`${stickyCls} min-w-[9rem] px-3 py-2`}>Předmět</th>
              <th className="px-2 py-2 text-center" title="Vážený průměr z assessmentů (všechna pololetí)">Průměr</th>
              <th className="px-2 py-2 text-center text-xs font-normal">ISM 2025</th>
              <th className="px-2 py-2 text-center text-xs font-normal">Svět 2025</th>
              {scenarios.map((sc) => (
                <ScenarioHeader
                  key={sc.id}
                  scenario={sc}
                  canDelete={scenarios.length > 1}
                  onRename={(name) => updateScenario(sc.id, { name })}
                  onActivate={() => activateScenario(sc.id)}
                  onDelete={() => window.confirm(`Smazat scénář „${sc.name}“?`) && deleteScenario(sc.id)}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.id} className={rowCls}>
                <td className={`${stickyCls} px-3 py-1.5`}>
                  <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">{s.level}</span>
                  {s.displayName}
                </td>
                <td className="px-2 text-center tabular-nums">{averages[s.id] === null ? '–' : averages[s.id].toFixed(2)}</td>
                <td className="px-2 text-center tabular-nums text-slate-500">{s.ismMean2025 ?? ''}</td>
                <td className="px-2 text-center tabular-nums text-slate-500">{s.worldMean2025 ?? ''}</td>
                {scenarios.map((sc) => (
                  <td key={sc.id} className={`px-2 py-1.5 text-center ${sc.isActive ? 'bg-violet-50' : ''}`}>
                    <GradeSelect
                      label={`${s.displayName} – ${sc.name}`}
                      value={sc.grades[s.id]}
                      onChange={(g) => updateScenario(sc.id, { grades: { [s.id]: g } })}
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr className={rowCls}>
              <td className={`${stickyCls} px-3 py-1.5`} title="Body za Theory of Knowledge + Extended Essay (0–3)">TOK + EE</td>
              <td colSpan={3} />
              {scenarios.map((sc) => (
                <td key={sc.id} className={`px-2 py-1.5 text-center ${sc.isActive ? 'bg-violet-50' : ''}`}>
                  <GradeSelect label={`TOK+EE – ${sc.name}`} options={CORE_OPTIONS} value={sc.corePoints} onChange={(g) => updateScenario(sc.id, { corePoints: g })} />
                </td>
              ))}
            </tr>
          </tbody>
          <tfoot className="border-t-2 border-slate-200">
            <tr>
              <td className={`${stickyCls} px-3 py-2 font-semibold`}>Celkem</td>
              <td colSpan={3} className="text-center text-xs text-slate-500">max. 45</td>
              {scenarios.map((sc) => (
                <td key={sc.id} className={`px-2 py-2 text-center text-lg font-semibold tabular-nums ${sc.isActive ? 'bg-violet-50' : ''}`}>
                  {summaries[sc.id]?.totals.total}
                </td>
              ))}
            </tr>
            <tr className="text-slate-600">
              <td className={`${stickyCls} px-3 py-1`}>HL profil / součet</td>
              <td colSpan={3} />
              {scenarios.map((sc) => {
                const t = summaries[sc.id]?.totals;
                return <td key={sc.id} className="px-2 py-1 text-center tabular-nums">{t?.hlProfile.join('-')} <span className="text-slate-400">({t?.hlSum})</span></td>;
              })}
            </tr>
            <tr className="text-slate-600">
              <td className={`${stickyCls} px-3 py-1`}>Diplom</td>
              <td colSpan={3} />
              {scenarios.map((sc) => {
                const issues = summaries[sc.id]?.totals.diplomaIssues ?? [];
                return (
                  <td key={sc.id} className="px-2 py-1 text-center" title={issues.join('\n')}>
                    {issues.length ? <span className="cursor-help text-red-600">✗ {issues.length}</span> : <span className="text-emerald-700">✓</span>}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className={`${stickyCls} px-3 py-2 text-slate-600`}>Programy</td>
              <td colSpan={3} />
              {scenarios.map((sc) => {
                const c = summaries[sc.id]?.counts;
                return (
                  <td key={sc.id} className="px-2 py-2 text-center text-xs leading-5 tabular-nums">
                    {['meets', 'borderline', 'fails'].map((k) => (
                      <div key={k} title={STATUS_META[k].label}>{STATUS_META[k].icon} {c?.[k]}</div>
                    ))}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-slate-500">❔ {summaries[activeScenario?.id]?.counts.unknown} programů nelze vyhodnotit automaticky (chybí požadavky nebo vlastní výběrové řízení).</p>
    </div>
  );
}
