import { useEffect, useState } from 'react';

const BAND_LABEL = { '0': '0', '1-2': '1–2', '3-4': '3–4', '5-6': '5–6' };

function useChecked(key) {
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? {}; } catch { return {}; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(checked)); } catch { /* soukromé okno */ }
  }, [key, checked]);
  return [checked, (k) => setChecked((c) => ({ ...c, [k]: !c[k] }))];
}

function Tips({ title, items, tone }) {
  if (!items?.length) return null;
  return (
    <div>
      <h4 className={`text-sm font-semibold ${tone}`}>{title}</h4>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );
}

export default function Guide({ rubric, code }) {
  const [checked, toggle] = useChecked(`ia-checklist-${code}`);
  return (
    <div className="space-y-4">
      <div className="card text-sm text-slate-700">
        <p className="font-semibold">{rubric.title}</p>
        <p className="mt-1">4 criteria × 6 marks = {rubric.totalMarks} marks, i.e. {rubric.weightOfFinalPct}% of the final SEHS assessment. Maximum {rubric.maxWords} words.</p>
        <p className="mt-1 text-slate-600">{rubric.wordCountNote}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">{rubric.rules.map((r, i) => <li key={i}>{r}</li>)}</ul>
        <p className="mt-2 text-xs text-slate-500">Source: {rubric.source}</p>
      </div>

      {rubric.criteria.map((c) => {
        const done = c.checklist.filter((_, i) => checked[`${c.id}-${i}`]).length;
        return (
          <details key={c.id} className="card group" open={c.id === 'research_design'}>
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
              <span className="text-lg font-semibold">{c.name} <span className="text-sm font-normal text-slate-500">(max {c.max} marks)</span></span>
              <span className="text-xs text-slate-500">checklist {done} / {c.checklist.length}</span>
            </summary>
            <p className="mt-2 text-sm text-slate-600">{c.assesses}</p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Tips title="What to include for maximum marks" items={c.tips} tone="text-emerald-700" />
              <Tips title="For your topic: plank and EMG" items={c.topicTips} tone="text-fuchsia-700" />
            </div>

            <h4 className="mt-5 text-sm font-semibold">Official bands</h4>
            <div className="mt-1 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <tbody>
                  {c.bands.map((b) => (
                    <tr key={b.marks} className="border-t border-slate-200 align-top">
                      <td className="w-14 py-2 pr-2 font-semibold">{BAND_LABEL[b.marks]}</td>
                      <td className="py-2 text-slate-700"><ul className="space-y-1">{b.descriptors.map((d, i) => <li key={i}>{d}</li>)}</ul></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4 className="mt-4 text-sm font-semibold">Checklist to tick off while writing</h4>
            <ul className="mt-1 space-y-1 text-sm">
              {c.checklist.map((q, i) => {
                const k = `${c.id}-${i}`;
                return (
                  <li key={k}>
                    <label className="flex cursor-pointer items-start gap-2 py-0.5">
                      <input type="checkbox" className="mt-1" checked={!!checked[k]} onChange={() => toggle(k)} />
                      <span className={checked[k] ? 'text-slate-400 line-through' : 'text-slate-700'}>{q}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}
    </div>
  );
}
