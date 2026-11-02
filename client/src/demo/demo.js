// Ukázkový režim (/?demo): aplikace běží bez přihlášení nad smyšlenými daty v paměti prohlížeče.
// Katalog škol je veřejný (db/seed/catalog.json), známky a assessmenty jsou vymyšlené.
// Data se generují příkazem `node tools/build-demo.js`. Nic se neposílá na server a nic se neukládá.
import demoData from './demoData.json';

const KEY = 'lukas-demo';

function detect() {
  try {
    if (new URLSearchParams(window.location.search).has('demo')) sessionStorage.setItem(KEY, '1');
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return new URLSearchParams(window.location.search).has('demo');
  }
}

export const DEMO = detect();

export function leaveDemo() {
  try { sessionStorage.removeItem(KEY); } catch {}
  window.location.href = '/login';
}

const DEMO_USER = { id: 0, name: 'Ukázka', email: 'ukazka@example.com', role: 'parent', isFirstLogin: false };

// Hluboká kopie, ať se úpravy nepropisují do importovaného JSON.
const db = JSON.parse(JSON.stringify(demoData));
let nextId = 100000;

const fail = (status, message) => { const e = new Error(message); e.status = status; throw e; };
const find = (list, id, what) => list.find((x) => x.id === id) ?? fail(404, `${what} neexistuje`);

function scenarios() { return db.student.scenarios; }

// Náhrada REST API: [metoda, cesta, obsluha(parametry, tělo)] → data, která by vrátil server v poli `data`.
const ROUTES = [
  ['get', /^\/auth\/me$/, () => DEMO_USER],
  ['post', /^\/auth\/logout$/, () => null],
  ['post', /^\/auth\/change-password$/, () => null],
  ['get', /^\/catalog$/, () => db.catalog],
  ['get', /^\/student$/, () => db.student],

  ['post', /^\/catalog\/programs$/, (_, b) => { const p = { ...b, id: nextId++ }; db.catalog.programs.push(p); return p; }],
  ['put', /^\/catalog\/programs\/(\d+)$/, ([id], b) => Object.assign(find(db.catalog.programs, id, 'Program'), b, { id })],
  ['delete', /^\/catalog\/programs\/(\d+)$/, ([id]) => { db.catalog.programs = db.catalog.programs.filter((p) => p.id !== id); return null; }],
  ['post', /^\/catalog\/universities$/, (_, b) => { const u = { ...b, id: nextId++ }; db.catalog.universities.push(u); return u; }],
  ['put', /^\/catalog\/universities\/(\d+)$/, ([id], b) => Object.assign(find(db.catalog.universities, id, 'Univerzita'), b, { id })],
  ['delete', /^\/catalog\/universities\/(\d+)$/, ([id]) => {
    if (db.catalog.programs.some((p) => p.universityId === id)) fail(409, 'Univerzita má programy – nejdřív je smažte');
    db.catalog.universities = db.catalog.universities.filter((u) => u.id !== id);
    return null;
  }],

  ['post', /^\/scenarios$/, (_, b) => {
    const src = b.copyFrom ? find(scenarios(), b.copyFrom, 'Scénář') : null;
    const sc = {
      id: nextId++, name: b.name, source: 'manual', isActive: false,
      corePoints: src?.corePoints ?? null, tokGrade: src?.tokGrade ?? null, eeGrade: src?.eeGrade ?? null,
      sortOrder: Math.max(0, ...scenarios().map((s) => s.sortOrder)) + 1,
      grades: src && src.source !== 'averages' ? { ...src.grades } : {},
    };
    scenarios().push(sc);
    return sc;
  }],
  ['put', /^\/scenarios\/(\d+)$/, ([id], b) => {
    const sc = find(scenarios(), id, 'Scénář');
    const { grades, ...rest } = b;
    Object.assign(sc, rest);
    if (grades) sc.grades = { ...sc.grades, ...grades };
    return sc;
  }],
  ['post', /^\/scenarios\/(\d+)\/activate$/, ([id]) => {
    find(scenarios(), id, 'Scénář');
    scenarios().forEach((s) => { s.isActive = s.id === id; });
    return scenarios();
  }],
  ['delete', /^\/scenarios\/(\d+)$/, ([id]) => {
    const sc = find(scenarios(), id, 'Scénář');
    if (sc.source === 'averages') fail(409, 'Scénář „podle průměrů“ nelze smazat');
    if (scenarios().length <= 1) fail(409, 'Poslední scénář nelze smazat');
    db.student.scenarios = scenarios().filter((s) => s.id !== id);
    if (sc.isActive) scenarios()[0].isActive = true;
    return scenarios();
  }],

  ['put', /^\/subjects\/(\d+)$/, ([id], b) => Object.assign(find(db.student.subjects, id, 'Předmět'), b, { id })],
  ['post', /^\/assessments$/, (_, b) => {
    const a = { criterion: null, grade: null, dueDate: null, notes: null, sortOrder: 0, ...b, id: nextId++ };
    db.student.assessments.push(a);
    return a;
  }],
  ['put', /^\/assessments\/(\d+)$/, ([id], b) => Object.assign(find(db.student.assessments, id, 'Assessment'), b, { id })],
  ['delete', /^\/assessments\/(\d+)$/, ([id]) => { db.student.assessments = db.student.assessments.filter((a) => a.id !== id); return null; }],
];

/** Axios adapter: odpoví z paměti místo volání serveru. */
export async function demoAdapter(config) {
  const method = (config.method || 'get').toLowerCase();
  const url = (config.url || '').replace(/^\/api/, '').split('?')[0];
  const body = typeof config.data === 'string' && config.data ? JSON.parse(config.data) : (config.data ?? {});
  const respond = (status, data) => ({ data, status, statusText: String(status), headers: {}, config, request: {} });

  for (const [m, re, handler] of ROUTES) {
    const match = m === method && re.exec(url);
    if (!match) continue;
    try {
      const data = handler(match.slice(1).map(Number), body);
      // kopie, ať React dostane nový objekt a stav v paměti zůstane oddělený
      return respond(200, { success: true, data: data == null ? null : JSON.parse(JSON.stringify(data)) });
    } catch (e) {
      const res = respond(e.status || 500, { success: false, error: e.message });
      return Promise.reject(Object.assign(new Error(e.message), { response: res, config }));
    }
  }
  const res = respond(404, { success: false, error: 'V ukázce není k dispozici' });
  return Promise.reject(Object.assign(new Error('Not found'), { response: res, config }));
}
