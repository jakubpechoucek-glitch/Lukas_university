import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { useData } from '../context/DataContext';
import { COUNTRIES } from '../lib/format';

const FIELDS = [
  ['name', 'Název', 'text', true],
  ['city', 'Město'],
  ['address', 'Adresa', 'textarea'],
  ['website', 'Web', 'url'],
  ['mapUrl', 'Odkaz na mapu', 'url'],
  ['worldRankText', 'Světový žebříček (např. 157 nebo 326~350)'],
  ['czConnection', 'Spojení s ČR'],
  ['accommodation', 'Ubytování přes univerzitu'],
  ['livingCosts', 'Životní náklady za rok', 'number'],
  ['livingCostsCurrency', 'Měna nákladů'],
  ['notes', 'Poznámky', 'textarea'],
];

export default function UniversityForm({ university, onClose, onSaved }) {
  const { saveUniversity, deleteUniversity, catalog } = useData();
  const [form, setForm] = useState(university ?? { name: '', country: 'GB' });
  const [busy, setBusy] = useState(false);
  const programCount = university ? catalog.programs.filter((p) => p.universityId === university.id).length : 0;

  async function save() {
    setBusy(true);
    try {
      const saved = await saveUniversity(form);
      toast.success('Univerzita uložena');
      onSaved?.(saved);
      onClose();
    } catch {
      /* chybu už zobrazil DataContext */
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Smazat univerzitu „${university.name}“?`)) return;
    await deleteUniversity(university.id);
    onClose();
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal
      title={university ? 'Upravit univerzitu' : 'Nová univerzita'}
      onClose={onClose}
      footer={(
        <>
          {university && (
            <button className="btn-danger mr-auto" onClick={remove} disabled={programCount > 0} title={programCount ? 'Univerzita má programy' : ''}>Smazat</button>
          )}
          <button className="btn-secondary" onClick={onClose}>Zrušit</button>
          <button className="btn-primary" onClick={save} disabled={busy || !form.name?.trim()}>Uložit</button>
        </>
      )}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="label">
          Země
          <select className="input mt-1" value={form.country ?? ''} onChange={(e) => set('country', e.target.value)}>
            {Object.entries(COUNTRIES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>
        {FIELDS.map(([key, label, type = 'text', required]) => (
          <label key={key} className={`label ${type === 'textarea' || key === 'name' ? 'sm:col-span-2' : ''}`}>
            {label}{required && ' *'}
            {type === 'textarea' ? (
              <textarea className="input mt-1" rows={2} value={form[key] ?? ''} onChange={(e) => set(key, e.target.value)} />
            ) : (
              <input className="input mt-1" type={type} value={form[key] ?? ''} onChange={(e) => set(key, e.target.value)} />
            )}
          </label>
        ))}
      </div>
    </Modal>
  );
}
