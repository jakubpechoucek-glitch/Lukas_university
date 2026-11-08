const ANSWER = {
  yes: { icon: '✓', cls: 'bg-emerald-100 text-emerald-800', label: 'yes' },
  partly: { icon: '◐', cls: 'bg-amber-100 text-amber-800', label: 'partly' },
  no: { icon: '✗', cls: 'bg-red-100 text-red-800', label: 'no' },
  unclear: { icon: '?', cls: 'bg-slate-100 text-slate-600', label: 'unclear' },
};

const BAND = {
  '5-6': 'bg-emerald-100 text-emerald-800',
  '3-4': 'bg-amber-100 text-amber-800',
  '1-2': 'bg-orange-100 text-orange-800',
  0: 'bg-red-100 text-red-800',
  '0': 'bg-red-100 text-red-800',
};

export function Badge({ kind, children }) {
  const a = ANSWER[kind];
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${a.cls}`}><span aria-hidden="true">{a.icon}</span>{children ?? a.label}</span>;
}

function List({ title, items, tone = '' }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3">
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className={`mt-1 list-disc space-y-1 pl-5 text-sm ${tone}`}>{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );
}

function CriterionCard({ c }) {
  const answered = c.checklist.filter((q) => q.answer === 'yes').length;
  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">{c.name}</h3>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${BAND[c.band]}`}>band {c.band}</span>
          <span className="text-lg font-semibold">{c.marks}<span className="text-sm font-normal text-slate-500"> / {c.max}</span></span>
        </div>
      </div>
      <p className="mt-2 text-sm text-slate-700">{c.rationale}</p>

      <h4 className="mt-4 text-sm font-semibold">Band 5–6 requirements</h4>
      <ul className="mt-1 space-y-2">
        {c.descriptors.map((d, i) => (
          <li key={i} className="rounded-lg border border-slate-200 p-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="font-medium text-slate-800">{d.text}</span>
              <Badge kind={d.met} />
            </div>
            {d.evidence && <blockquote className="mt-2 border-l-2 border-slate-300 pl-2 text-xs italic text-slate-600">„{d.evidence}“</blockquote>}
            {d.comment && <p className="mt-1 text-slate-600">{d.comment}</p>}
          </li>
        ))}
      </ul>

      <List title="What is missing for the next band" items={c.missingForNextBand} />
      <List title="What went well" items={c.strengths} tone="text-emerald-800" />

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-semibold">Checklist ({answered} / {c.checklist.length} met)</summary>
        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {c.checklist.map((q) => (
            <li key={q.n} className="flex items-start gap-3 py-2">
              <Badge kind={q.answer}>{ANSWER[q.answer].label}</Badge>
              <div>
                <p>{q.question}</p>
                {q.comment && <p className="mt-0.5 text-xs text-slate-500">{q.comment}</p>}
              </div>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

export function ReportResult({ review }) {
  const r = review.result;
  return (
    <div className="space-y-4">
      <div className="card border-fuchsia-200 bg-fuchsia-50/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Estimate: {r.totalMarks} / {r.totalMax} marks</h2>
          {review.wordCount != null && <span className="text-sm text-slate-600">{review.wordCount} words in the text</span>}
        </div>
        <p className="mt-2 text-sm text-slate-700">{r.summary}</p>
        {r.topPriorities?.length > 0 && (
          <>
            <h3 className="mt-3 text-sm font-semibold">Fix these first</h3>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">{r.topPriorities.map((t, i) => <li key={i}>{t}</li>)}</ol>
          </>
        )}
        <p className="mt-3 text-xs text-slate-500">Unofficial, indicative estimate based on the IB rubric, meant for learning. Your teacher and the IB decide the actual marks.</p>
      </div>
      {r.criteria.map((c) => <CriterionCard key={c.id} c={c} />)}
    </div>
  );
}

const SEVERITY = { high: 'bg-red-100 text-red-800', medium: 'bg-amber-100 text-amber-800', low: 'bg-slate-100 text-slate-700' };
const SEVERITY_LABEL = { high: 'important', medium: 'moderate', low: 'minor' };

export function RqResult({ review }) {
  const r = review.result;
  return (
    <div className="space-y-4">
      <div className="card border-fuchsia-200 bg-fuchsia-50/40">
        <h2 className="text-lg font-semibold">Feedback on the research question</h2>
        {review.researchQuestion && <blockquote className="mt-2 border-l-2 border-fuchsia-300 pl-3 text-sm italic text-slate-700">{review.researchQuestion}</blockquote>}
        <p className="mt-3 text-sm text-slate-700">{r.summary}</p>
        <List title="What went well" items={r.strengths} tone="text-emerald-800" />
      </div>

      {r.issues.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold">What to improve</h3>
          <ul className="mt-2 space-y-3">
            {r.issues.map((i, k) => (
              <li key={k} className="rounded-lg border border-slate-200 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{i.aspect}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY[i.severity]}`}>{SEVERITY_LABEL[i.severity]}</span>
                </div>
                <p className="mt-1 text-slate-700">{i.problem}</p>
                <p className="mt-1 text-slate-600"><span className="font-medium">What to do:</span> {i.suggestion}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(r.questionsToAnswer.length > 0 || r.improvedStructure) && (
        <div className="card">
          <List title="What you must be able to answer in Research design" items={r.questionsToAnswer} />
          {r.improvedStructure && (
            <>
              <h4 className="mt-4 text-sm font-semibold">Question template to complete</h4>
              <p className="mt-1 rounded-lg bg-slate-50 p-3 text-sm italic text-slate-700">{r.improvedStructure}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
