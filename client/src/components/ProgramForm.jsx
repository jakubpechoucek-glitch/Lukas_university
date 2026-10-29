import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { evaluateProgram } from '@calc';
import Modal from './Modal';
import RequirementEditor from './RequirementEditor';
import UniversityForm from './UniversityForm';
import StatusBadge from './StatusBadge';
import { useData, scenarioSubjects, scenarioTotals } from '../context/DataContext';
import { PROGRAM_STATUSES, describeSet } from '../lib/format';

const TEXT_FIELDS = [
  ['degree', 'Titul (BSc, MSci…)'],
  ['durationYears', 'Délka studia (roky)', 'number'],
  ['programUrl', 'Stránka programu', 'url', 'sm:col-span-2'],
  ['fieldRank', 'Oborový žebříček (UK)', 'number'],
  ['subjectWorldRankText', 'Oborový světový žebříček'],
  ['tuitionFee', 'Školné za rok', 'number'],
  ['tuitionCurrency', 'Měna školného'],
  ['applicationDeadline', 'Uzávěrka přihlášky', 'date'],
  ['startDate', 'Začátek výuky', 'date'],
  ['openDays', 'Open days', 'text', 'sm:col-span-2'],
  ['mastersInfo', 'Navazující magisterské studium', 'text', 'sm:col-span-2'],
];

const blankProgram = (fieldId) => ({
  universityId: '', fieldId, name: '', status: 'research', requirementSets: [], manualReview: false,
});

export default function ProgramForm({ program, defaultFieldId, onClose }) {
  const { catalog, student, activeScenario, saveProgram, deleteProgram } = useData();
  const [form, setForm] = useState(() => structuredClone(program ?? blankProgram(defaultFieldId ?? catalog.fields[0]?.id)));
  const [busy, setBusy] = useState(false);
  const [uniForm, setUniForm] = useState(null); // null | 'new' | university
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Živý náhled vyhodnocení s aktivním scénářem.
  const preview = useMemo(() => {
    if (!activeScenario) return null;
    return evaluateProgram(form, scenarioSubjects(student.subjects, activeScenario), scenarioTotals(student.subjects, activeScenario));
  }, [form, student, activeScenario]);

  async function save() {
    setBusy(true);
    try {
      await saveProgram(form);
      toast.success('Program uložen');
      onClose();
    } catch {
      /* chybu už zobrazil DataContext */
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Smazat program „${program.name}“?`)) return;
    await deleteProgram(program.id);
    toast.success('Program smazán');
    onClose();
  }

  const university = catalog.universities.find((u) => u.id === Number(form.universityId));

  return (
    <>
      <Modal
        wide
        title={program ? 'Upravit program' : 'Nový program'}
        onClose={onClose}
        footer={(
          <>
            {program && <button className="btn-danger mr-auto" onClick={remove}>Smazat</button>}
            <button className="btn-secondary" onClick={onClose}>Zrušit</button>
            <button className="btn-primary" onClick={save} disabled={busy || !form.name?.trim() || !form.universityId}>Uložit</button>
          </>
        )}
      >
        <div className="space-y-6">
          <section className="grid gap-3 sm:grid-cols-2">
            <label className="label sm:col-span-2">
              Univerzita *
              <div className="mt-1 flex gap-2">
                <select className="input" value={form.universityId ?? ''} onChange={(e) => set('universityId', Number(e.target.value))}>
                  <option value="">– vyberte –</option>
                  {catalog.universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                {university && <button type="button" className="btn-secondary whitespace-nowrap" onClick={() => setUniForm(university)}>Upravit</button>}
                <button type="button" className="btn-secondary whitespace-nowrap" onClick={() => setUniForm('new')}>+ Nová</button>
              </div>
            </label>
            <label className="label sm:col-span-2">
              Název programu *
              <input className="input mt-1" value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
            </label>
            <label className="label">
              Obor
              <select className="input mt-1" value={form.fieldId} onChange={(e) => set('fieldId', Number(e.target.value))}>
                {catalog.fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
            <label className="label">
              Stav přihlášky
              <select className="input mt-1" value={form.status} onChange={(e) => set('status', e.target.value)}>
                {Object.entries(PROGRAM_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="label">
              Přihláškový systém
              <select className="input mt-1" value={form.applicationSystem ?? ''} onChange={(e) => set('applicationSystem', e.target.value || null)}>
                <option value="">–</option>
                {['UCAS', 'Studielink', 'CAO', 'direct', 'other'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="label">
              Priorita (moje pořadí)
              <input type="number" min={0} className="input mt-1" value={form.priority ?? ''} onChange={(e) => set('priority', e.target.value === '' ? null : Number(e.target.value))} />
            </label>
            {TEXT_FIELDS.map(([key, label, type = 'text', span = '']) => (
              <label key={key} className={`label ${span}`}>
                {label}
                <input className="input mt-1" type={type} value={form[key] ?? ''} onChange={(e) => set(key, e.target.value === '' ? null : e.target.value)} />
              </label>
            ))}
            <label className="label sm:col-span-2">
              Poznámky
              <textarea className="input mt-1" rows={2} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
            </label>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Požadavky na IB</h3>
              {preview && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  Scénář „{activeScenario.name}“: <StatusBadge result={preview} />
                  {preview.reasons?.length > 0 && <span className="text-xs">{preview.reasons.join('; ')}</span>}
                </div>
              )}
            </div>
            <label className="label">
              Původní text požadavků (ze stránek školy)
              <textarea className="input mt-1 font-mono text-xs" rows={5} value={form.requirementsText ?? ''} onChange={(e) => set('requirementsText', e.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.manualReview} onChange={(e) => set('manualReview', e.target.checked)} />
              Nelze vyhodnotit automaticky (výběrové řízení, GPA, esej…)
            </label>
            <label className="label">
              Kategorie (ručně, jinak se počítá z rezervy)
              <select className="input mt-1 sm:w-48" value={form.categoryOverride ?? ''} onChange={(e) => set('categoryOverride', e.target.value || null)}>
                <option value="">automaticky</option>
                {['Reach', 'Target', 'Likely'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <RequirementEditor sets={form.requirementSets} onChange={(sets) => set('requirementSets', sets)} />
            {form.requirementSets.length > 0 && (
              <ul className="list-inside list-disc text-xs text-slate-500">
                {form.requirementSets.map((s, i) => <li key={i}>{s.kind === 'contextual' ? '(contextual) ' : ''}{describeSet(s)}</li>)}
              </ul>
            )}
          </section>
        </div>
      </Modal>
      {uniForm && (
        <UniversityForm
          university={uniForm === 'new' ? null : uniForm}
          onClose={() => setUniForm(null)}
          onSaved={(u) => set('universityId', u.id)}
        />
      )}
    </>
  );
}
