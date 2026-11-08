import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import rubrics from '@ia/rubrics.json';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import Guide from '../components/ia/Guide';
import { ReportResult, RqResult } from '../components/ia/ReviewResult';
import { formatDate } from '../lib/format';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const errText = (err, fallback) => err?.response?.data?.error || fallback;
const wordCount = (t) => (t.match(/\S+/g) || []).length;

function readBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/** Načte kontrolu a dokud běží, každé 3 s ji dotáže znovu. */
function useReview(id) {
  const [review, setReview] = useState(null);
  useEffect(() => {
    if (!id) { setReview(null); return undefined; }
    let stop = false;
    let timer;
    const load = async () => {
      try {
        const { data } = await api.get(`/ia/reviews/${id}`);
        if (stop) return;
        setReview(data.data);
        if (data.data.status === 'pending') timer = setTimeout(load, 3000);
      } catch (err) {
        if (!stop) setReview({ id, status: 'error', error: errText(err, 'Kontrolu se nepodařilo načíst') });
      }
    };
    load();
    return () => { stop = true; clearTimeout(timer); };
  }, [id]);
  return review;
}

function ReviewView({ review }) {
  if (!review) return null;
  if (review.status === 'pending') {
    return (
      <div className="card flex items-center gap-3 text-sm text-slate-600">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-fuchsia-600 border-t-transparent" />
        Vyhodnocuji… Trvá to obvykle 30–90 sekund, stránku můžeš nechat otevřenou.
      </div>
    );
  }
  if (review.status === 'error') return <div className="card text-sm text-red-700">{review.error}</div>;
  return review.kind === 'rq' ? <RqResult review={review} /> : <ReportResult review={review} />;
}

function AiNotice({ available }) {
  if (available) return null;
  return (
    <div className="card border-amber-200 bg-amber-50 text-sm text-amber-900">
      AI kontrola zatím není zapnutá. Na Renderu chybí proměnná <code>ANTHROPIC_API_KEY</code>. Průvodce a checklisty fungují i bez ní.
    </div>
  );
}

function ResearchQuestionTab({ subject, rubric, aiAvailable, onChanged, review, setReviewId }) {
  const [draft, setDraft] = useState(subject.researchQuestion);
  const [busy, setBusy] = useState(false);
  const saved = draft.trim() === subject.researchQuestion.trim();

  async function save() {
    setBusy(true);
    try {
      await api.put(`/ia/subjects/${subject.subjectId}/research-question`, { researchQuestion: draft });
      await onChanged();
      toast.success('Výzkumná otázka uložena');
    } catch (err) {
      toast.error(errText(err, 'Uložení se nezdařilo'));
    } finally { setBusy(false); }
  }

  async function check() {
    setBusy(true);
    try {
      if (!saved) await api.put(`/ia/subjects/${subject.subjectId}/research-question`, { researchQuestion: draft });
      const { data } = await api.post(`/ia/subjects/${subject.subjectId}/review-research-question`);
      await onChanged();
      setReviewId(data.data.id);
    } catch (err) {
      toast.error(errText(err, 'Kontrola se nespustila'));
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <label className="block text-sm font-medium">
          Výzkumná otázka
          <textarea className="input mt-1 min-h-[120px]" value={draft} onChange={(e) => setDraft(e.target.value)}
            placeholder="To what extent does … affect … , measured using … , in …?" />
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" disabled={busy || saved} onClick={save}>Uložit</button>
          <button className="btn-primary" disabled={busy || !aiAvailable || draft.trim().length < 10} onClick={check}>Zkontrolovat otázku (AI)</button>
        </div>
      </div>
      <AiNotice available={aiAvailable} />
      <ReviewView review={review && (review.kind === 'rq' || !review.kind) ? review : null} />
      <div className="card text-sm">
        <h3 className="font-semibold">{rubric.rqGuide.title}</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">{rubric.rqGuide.items.map((t, i) => <li key={i}>{t}</li>)}</ul>
      </div>
    </div>
  );
}

function ReportTab({ subject, rubric, aiAvailable, onChanged, review, setReviewId }) {
  const [mode, setMode] = useState('paste');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [criteria, setCriteria] = useState(() => rubric.criteria.map((c) => c.id));
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const words = useMemo(() => wordCount(text), [text]);

  const toggle = (id) => setCriteria((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const ready = criteria.length > 0 && ((mode === 'paste' && words >= 50) || (mode === 'gdoc' && url.trim()) || (mode === 'file' && file));

  async function submit() {
    setBusy(true);
    try {
      const body = { criteria };
      if (mode === 'paste') Object.assign(body, { source: 'paste', text });
      else if (mode === 'gdoc') Object.assign(body, { source: 'gdoc', url: url.trim() });
      else {
        if (file.size > MAX_FILE_BYTES) { toast.error('Soubor je větší než 10 MB'); return; }
        Object.assign(body, { source: 'file', file: { name: file.name, mimeType: file.type, dataBase64: await readBase64(file) } });
      }
      const { data } = await api.post(`/ia/subjects/${subject.subjectId}/review-report`, body);
      await onChanged();
      setReviewId(data.data.id);
    } catch (err) {
      toast.error(errText(err, 'Kontrola se nespustila'));
    } finally { setBusy(false); }
  }

  const modes = [['paste', 'Vložit text'], ['file', 'Nahrát PDF / Word'], ['gdoc', 'Odkaz na Google Doc']];
  return (
    <div className="space-y-4">
      <div className="card space-y-4">
        <div className="flex flex-wrap gap-2" role="tablist">
          {modes.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
              className={`rounded-full px-3 py-1.5 text-sm ${mode === k ? 'bg-fuchsia-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{label}</button>
          ))}
        </div>

        {mode === 'paste' && (
          <div>
            <textarea className="input min-h-[220px] font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)}
              placeholder="V Google Docs: Ctrl+A, Ctrl+C a sem Ctrl+V. Grafy se jako obrázky nepřenesou, stačí popisky." />
            <p className={`mt-1 text-xs ${words > rubric.maxWords ? 'text-red-600' : 'text-slate-500'}`}>
              {words} slov (limit {rubric.maxWords} se počítá bez tabulek, grafů, rovnic a referencí)
            </p>
          </div>
        )}
        {mode === 'file' && (
          <div className="text-sm">
            <input ref={fileRef} type="file" accept=".pdf,.docx,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <p className="mt-2 text-xs text-slate-500">
              V Google Docs: Soubor → Stáhnout → PDF nebo Microsoft Word (.docx). U PDF model vidí i grafy a tabulky. Max. 10 MB.
            </p>
          </div>
        )}
        {mode === 'gdoc' && (
          <div className="text-sm">
            <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://docs.google.com/document/d/…" />
            <p className="mt-2 text-xs text-slate-500">
              Dokument musí mít sdílení „Kdokoli s odkazem“ (čtenář). Pokud ho sdílet nechceš, použij PDF nebo vložení textu.
            </p>
          </div>
        )}

        <fieldset>
          <legend className="text-sm font-medium">Co vyhodnotit</legend>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {rubric.criteria.map((c) => (
              <label key={c.id} className="flex items-center gap-1.5">
                <input type="checkbox" checked={criteria.includes(c.id)} onChange={() => toggle(c.id)} />{c.name}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">Rozepsanou zprávu můžeš kontrolovat po částech, třeba jen Research design.</p>
        </fieldset>

        <button className="btn-primary" disabled={busy || !aiAvailable || !ready} onClick={submit}>{busy ? 'Odesílám…' : 'Vyhodnotit'}</button>
      </div>
      <AiNotice available={aiAvailable} />
      <ReviewView review={review && (review.kind === 'report' || !review.kind) ? review : null} />
    </div>
  );
}

function HistoryTab({ subject, onOpen, onChanged }) {
  async function remove(id) {
    if (!window.confirm('Smazat tuto kontrolu?')) return;
    try {
      await api.delete(`/ia/reviews/${id}`);
      await onChanged();
    } catch (err) { toast.error(errText(err, 'Smazání se nezdařilo')); }
  }
  if (!subject.reviews.length) return <div className="card text-sm text-slate-500">Zatím tu nic není. Až spustíš první kontrolu, uloží se sem.</div>;
  const STATUS = { pending: 'běží', error: 'chyba', done: '' };
  return (
    <div className="card divide-y divide-slate-100">
      {subject.reviews.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
          <button className="text-left hover:underline" onClick={() => onOpen(r.id)}>
            <span className="font-medium">{r.kind === 'rq' ? 'Výzkumná otázka' : 'Zpráva'}</span>
            {r.kind === 'report' && r.totalMarks != null && <span className="ml-2 font-semibold text-fuchsia-700">{r.totalMarks} / {r.totalMax}</span>}
            {STATUS[r.status] && <span className="ml-2 text-xs text-slate-500">({STATUS[r.status]})</span>}
            <span className="ml-2 text-xs text-slate-500">{formatDate((r.createdAt || '').slice(0, 10))}{r.wordCount ? ` · ${r.wordCount} slov` : ''}</span>
          </button>
          <button className="text-xs text-slate-400 hover:text-red-600" onClick={() => remove(r.id)}>Smazat</button>
        </div>
      ))}
    </div>
  );
}

const TABS = [['rq', 'Výzkumná otázka'], ['report', 'Kontrola práce'], ['guide', 'Průvodce k maximu bodů'], ['history', 'Historie']];

export default function IA() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [subjectId, setSubjectId] = useState(null);
  const [tab, setTab] = useState('rq');
  const [reviewId, setReviewId] = useState(null);

  const reload = useCallback(async () => {
    try {
      const { data: res } = await api.get('/ia');
      setData(res.data);
      setSubjectId((id) => id ?? res.data.subjects[0]?.subjectId ?? null);
    } catch (err) { setError(errText(err, 'Nepodařilo se načíst data')); }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const review = useReview(reviewId);
  // Po dokončení kontroly obnov přehled (kvůli historii a součtům).
  const finished = review?.status && review.status !== 'pending' ? review.id : null;
  useEffect(() => { if (finished) reload(); }, [finished, reload]);

  if (error) return <div className="card text-center text-red-600">{error}</div>;
  if (!data) return <div className="py-16 text-center text-slate-500">Načítám…</div>;
  const subject = data.subjects.find((s) => s.subjectId === subjectId);
  if (!subject) {
    return (
      <div className="space-y-4">
        <PageHeader subtitle="Kontrola vlastní práce podle kritérií IB" />
        <div className="card text-sm text-slate-600">
          {data.demo ? 'V ukázkovém režimu tato sekce není dostupná.' : 'Zatím není žádný předmět s rubrikou Internal Assessment.'}
        </div>
      </div>
    );
  }
  const rubric = rubrics[subject.code];

  const open = (id) => { setReviewId(id); setTab('review'); };

  return (
    <div className="space-y-4">
      <PageHeader
        subtitle={`${subject.displayName} (${subject.level}): vlastní kontrola práce podle kritérií IB`}
        actions={data.subjects.length > 1 && (
          <select className="input w-auto" value={subjectId} onChange={(e) => { setSubjectId(Number(e.target.value)); setReviewId(null); }}>
            {data.subjects.map((s) => <option key={s.subjectId} value={s.subjectId}>{s.displayName}</option>)}
          </select>
        )}
      />

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
        {[...TABS, ...(tab === 'review' ? [['review', 'Výsledek']] : [])].map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${tab === k ? 'border-fuchsia-600 font-semibold text-fuchsia-700' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>{label}</button>
        ))}
      </div>

      {tab === 'rq' && <ResearchQuestionTab key={subject.subjectId} subject={subject} rubric={rubric} aiAvailable={data.aiAvailable} onChanged={reload} review={review} setReviewId={setReviewId} />}
      {tab === 'report' && <ReportTab key={subject.subjectId} subject={subject} rubric={rubric} aiAvailable={data.aiAvailable} onChanged={reload} review={review} setReviewId={setReviewId} />}
      {tab === 'guide' && <Guide rubric={rubric} code={subject.code} />}
      {tab === 'history' && <HistoryTab subject={subject} onOpen={open} onChanged={reload} />}
      {tab === 'review' && <ReviewView review={review} />}
    </div>
  );
}
