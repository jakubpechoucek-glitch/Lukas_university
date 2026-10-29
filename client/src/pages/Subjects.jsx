import { useMemo, useState } from 'react';
import { weightedAverage, averageByCriterion, roundGrade } from '@calc';
import { useData } from '../context/DataContext';
import GradeSelect from '../components/GradeSelect';
import { TERMS, formatDate } from '../lib/format';
import { subjectAverage, fmtAvg } from '../lib/averages';
import PageHeader from '../components/PageHeader';

const pct = (w) => (w === null || w === undefined ? '' : String(Math.round(w * 1000) / 10));
const today = () => new Date().toISOString().slice(0, 10);

/** Textové/číselné pole, které uloží hodnotu až po opuštění (nebo Enteru). */
function CommitInput({ value, onCommit, className = '', ...props }) {
  const [draft, setDraft] = useState(value ?? '');
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setDraft(value ?? '');
  }
  const commit = () => {
    if (String(draft) !== String(value ?? '')) onCommit(draft);
  };
  return (
    <input
      {...props}
      className={`w-full rounded border border-transparent bg-transparent px-1.5 py-1 hover:border-slate-200 focus:border-primary focus:bg-white focus:outline-none ${className}`}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}

function AssessmentRow({ a, onUpdate, onDelete, onMove, isFirst, isLast }) {
  const overdue = a.dueDate && a.dueDate < today() && a.grade === null;
  return (
    <tr className="border-t border-slate-100">
      <td className="w-8 px-1 text-center text-slate-300">
        <button disabled={isFirst} className="block w-full hover:text-slate-700 disabled:invisible" onClick={() => onMove(-1)} aria-label="Posunout nahoru">▲</button>
        <button disabled={isLast} className="block w-full hover:text-slate-700 disabled:invisible" onClick={() => onMove(1)} aria-label="Posunout dolů">▼</button>
      </td>
      <td className="min-w-[12rem] px-1 py-1"><CommitInput aria-label="Název" value={a.name} onCommit={(name) => name.trim() && onUpdate({ name: name.trim() })} /></td>
      <td className="w-20 px-1 py-1"><CommitInput aria-label="Kritérium" placeholder="KU/TL" value={a.criterion} onCommit={(c) => onUpdate({ criterion: c.trim() || null })} /></td>
      <td className="w-24 px-1 py-1">
        <div className="flex items-center">
          <CommitInput
            aria-label="Váha v %"
            type="number" min={0} max={100} step="0.5" className="text-right tabular-nums"
            value={pct(a.weight)}
            onCommit={(v) => onUpdate({ weight: v === '' ? 0 : Number(v) / 100 })}
          />
          <span className="pl-0.5 text-slate-400">%</span>
        </div>
      </td>
      <td className="w-20 px-1 py-1 text-center"><GradeSelect label="Známka" value={a.grade} onChange={(grade) => onUpdate({ grade })} /></td>
      <td className="w-40 px-1 py-1">
        <input
          type="date" aria-label="Termín"
          className={`w-full rounded border border-transparent bg-transparent px-1 py-1 text-sm hover:border-slate-200 focus:border-primary ${overdue ? 'text-red-600' : ''}`}
          value={a.dueDate ?? ''}
          onChange={(e) => onUpdate({ dueDate: e.target.value || null })}
        />
      </td>
      <td className="w-8 px-1 text-center">
        <button className="text-slate-300 hover:text-red-600" onClick={onDelete} aria-label="Smazat">✕</button>
      </td>
    </tr>
  );
}

function Upcoming({ assessments, subjects }) {
  const t = today();
  const items = assessments
    .filter((a) => a.dueDate && a.grade === null)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 8);
  if (!items.length) return null;
  const name = (id) => subjects.find((s) => s.id === id)?.displayName;
  return (
    <div className="card">
      <h2 className="mb-2 font-semibold">Nadcházející termíny</h2>
      <ul className="space-y-1 text-sm">
        {items.map((a) => (
          <li key={a.id} className="flex gap-3">
            <span className={`w-24 shrink-0 tabular-nums ${a.dueDate < t ? 'font-medium text-red-600' : 'text-slate-600'}`}>{formatDate(a.dueDate)}</span>
            <span className="text-slate-500">{name(a.subjectId)}</span>
            <span>{a.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Subjects() {
  const { student, activeScenario, createAssessment, updateAssessment, deleteAssessment } = useData();
  const [subjectId, setSubjectId] = useState(null);
  const [term, setTerm] = useState(TERMS[0]);

  const subject = student?.subjects.find((s) => s.id === subjectId) ?? student?.subjects[0];
  const rows = useMemo(() => (student && subject
    ? student.assessments.filter((a) => a.subjectId === subject.id && a.term === term).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    : []), [student, subject, term]);

  if (!student || !subject) return null;

  const stats = weightedAverage(rows);
  const byCriterion = averageByCriterion(rows);
  const overall = subjectAverage(student.assessments, subject.id);
  const predicted = activeScenario?.grades?.[subject.id];
  const components = student.examComponents.filter((c) => c.subjectId === subject.id);
  const termsWithData = new Set(student.assessments.filter((a) => a.subjectId === subject.id).map((a) => a.term));

  async function move(index, dir) {
    // Přečíslovat celé pololetí, aby pořadí bylo jednoznačné.
    const order = rows.map((r) => r.id);
    const [id] = order.splice(index, 1);
    order.splice(index + dir, 0, id);
    await Promise.all(order.map((rowId, i) => (rows.find((r) => r.id === rowId).sortOrder !== i
      ? updateAssessment(rowId, { sortOrder: i })
      : null)));
  }

  return (
    <div className="space-y-4">
      <PageHeader subtitle="Vážený průměr počítá jen hodnocené položky, takže se nic nepřepisuje ručně." />

      <div className="flex gap-1 overflow-x-auto pb-1">
        {student.subjects.map((s) => {
          const avg = subjectAverage(student.assessments, s.id);
          return (
            <button
              key={s.id}
              onClick={() => setSubjectId(s.id)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-left text-sm ${s.id === subject.id ? 'bg-emerald-600 font-semibold text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-emerald-50'}`}
            >
              <span className="mr-1 text-xs opacity-70">{s.level}</span>{s.displayName}
              <span className="ml-2 tabular-nums opacity-80">{fmtAvg(avg)}</span>
              {avg !== null && <span className={`ml-1.5 rounded px-1.5 py-0.5 text-xs font-bold tabular-nums ${s.id === subject.id ? 'bg-white/25' : 'bg-emerald-100 text-emerald-800'}`}>{roundGrade(avg)}</span>}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {TERMS.map((t) => (
              <button
                key={t}
                onClick={() => setTerm(t)}
                className={`rounded-full border px-3 py-1 text-sm ${t === term ? 'border-emerald-600 bg-emerald-50 font-medium text-emerald-800' : 'border-slate-200 bg-white text-slate-600'}`}
              >
                {t}{termsWithData.has(t) ? '' : ' ·'}
              </button>
            ))}
          </div>

          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th />
                  <th className="px-2 py-2">Assessment</th>
                  <th className="px-2 py-2">Kritérium</th>
                  <th className="px-2 py-2 text-right">Váha</th>
                  <th className="px-2 py-2 text-center">Známka</th>
                  <th className="px-2 py-2">Termín</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((a, i) => (
                  <AssessmentRow
                    key={a.id}
                    a={a}
                    isFirst={i === 0}
                    isLast={i === rows.length - 1}
                    onUpdate={(patch) => updateAssessment(a.id, patch)}
                    onDelete={() => window.confirm(`Smazat „${a.name}“?`) && deleteAssessment(a.id)}
                    onMove={(dir) => move(i, dir)}
                  />
                ))}
                {!rows.length && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">V pololetí {term} zatím nejsou žádné assessmenty.</td></tr>
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 text-sm">
                <tr>
                  <td />
                  <td className="px-2 py-2">
                    <button
                      className="font-medium text-emerald-700 hover:underline"
                      onClick={() => createAssessment({ subjectId: subject.id, term, name: 'Nový assessment', weight: 0 })}
                    >
                      + Přidat řádek
                    </button>
                  </td>
                  <td className="px-2 py-2 text-right text-slate-500">Součet</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${stats.weightWarning ? 'font-semibold text-amber-700' : 'text-slate-600'}`}>
                    {pct(stats.weightTotal)} %
                  </td>
                  <td className="px-2 py-2 text-center text-lg font-semibold tabular-nums">{fmtAvg(stats.average)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
          {stats.weightWarning && (
            <p className="text-sm text-amber-700">⚠️ Váhy se nesčítají na 100 % ({pct(stats.weightTotal)} %). Průměr je přesto správný – počítá se jen z hodnocených položek.</p>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card space-y-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Vážený průměr {term}</div>
              <div className="text-3xl font-semibold tabular-nums">{fmtAvg(stats.average)}</div>
              {stats.rounded !== null && (
                <div className="mt-1 text-sm text-slate-600">
                  známka <span className="rounded bg-emerald-100 px-2 py-0.5 text-base font-bold text-emerald-800">{stats.rounded}</span>
                  <span className="ml-1 text-xs text-slate-400">(zaokrouhleno matematicky)</span>
                </div>
              )}
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>Ohodnoceno</span>
                <span>{stats.gradedCount}/{stats.count} · {Math.round(stats.coverage * 100)} % vah</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-emerald-500" style={{ width: `${Math.round(stats.coverage * 100)}%` }} />
              </div>
            </div>
            {Object.keys(byCriterion).length > 0 && (
              <div className="flex gap-4 text-sm">
                {Object.entries(byCriterion).map(([k, v]) => (
                  <div key={k}><span className="text-slate-500">{k}</span> <b className="tabular-nums">{fmtAvg(v)}</b></div>
                ))}
              </div>
            )}
            <dl className="grid grid-cols-2 gap-y-1 border-t border-slate-100 pt-3 text-sm">
              <dt className="text-slate-500">Všechna pololetí</dt><dd className="text-right tabular-nums">{fmtAvg(overall)}{overall !== null && <b className="ml-1.5 text-emerald-700">→ {roundGrade(overall)}</b>}</dd>
              <dt className="text-slate-500">Predikce „{activeScenario?.name}“</dt><dd className="text-right tabular-nums">{predicted ?? '–'}</dd>
              <dt className="text-slate-500">ISM průměr 2025</dt><dd className="text-right tabular-nums">{subject.ismMean2025 ?? '–'}</dd>
              <dt className="text-slate-500">Světový průměr 2025</dt><dd className="text-right tabular-nums">{subject.worldMean2025 ?? '–'}</dd>
            </dl>
          </div>

          {components.length > 0 && (
            <div className="card">
              <h2 className="mb-2 text-sm font-semibold">Závěrečná zkouška IB</h2>
              <ul className="space-y-1 text-sm">
                {components.map((c) => (
                  <li key={c.id} className="flex justify-between"><span>{c.name}</span><span className="tabular-nums text-slate-600">{pct(c.weight)} %</span></li>
                ))}
              </ul>
            </div>
          )}

          <Upcoming assessments={student.assessments} subjects={student.subjects} />
        </aside>
      </div>
    </div>
  );
}
