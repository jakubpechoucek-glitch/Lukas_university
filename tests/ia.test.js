const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lukas-ia-'));
process.env.DATABASE_URL = path.join(tmpDir, 'test.db');
process.env.JWT_SECRET = 'test-secret';
process.env.BCRYPT_ROUNDS = '4';
process.env.BOOTSTRAP_USERS = 'Student|student@example.com|student';
process.env.INITIAL_PASSWORD = 'Docasne1';
delete process.env.ANTHROPIC_API_KEY;

const request = require('supertest');
const app = require('../server/index');
const { closeDb, getDb } = require('../db/db');
const ai = require('../server/services/ia-ai.service');
const { countWords, estimateCountedWords, extract } = require('../server/services/ia-extract.service');
const rubrics = require('../shared/ia/rubrics.json');

after(() => { closeDb(); fs.rmSync(tmpDir, { recursive: true, force: true }); });

let token;
const api = (method, url) => request(app)[method](url).set('Authorization', `Bearer ${token}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(id) {
  for (let i = 0; i < 50; i++) {
    const res = await api('get', `/api/ia/reviews/${id}`);
    if (res.body.data.status !== 'pending') return res.body.data;
    await sleep(20);
  }
  throw new Error('review neskončilo');
}

// Falešný klient Claude: vrátí tool_use s daným vstupem a zapamatuje si poslední požadavek.
function fakeClient(inputFor) {
  const calls = [];
  return {
    calls,
    messages: {
      create: async (req) => {
        calls.push(req);
        if (inputFor === 'fail') throw Object.assign(new Error('x'), { status: 401 });
        return { content: [{ type: 'tool_use', name: req.tools[0].name, input: inputFor(req) }] };
      },
    },
  };
}

const reportInput = (req) => {
  const ids = req.tools[0].input_schema.properties.criteria.items.properties.id.enum;
  return {
    summary: 'Celkově slušné.',
    top_priorities: ['Doplnit nejistoty'],
    criteria: ids.map((id) => ({
      id, marks: id === 'research_design' ? 9 : 4, rationale: 'Důvod',
      descriptors: [{ met: 'partly', evidence: 'citát', comment: 'k' }, { met: 'yes', evidence: '', comment: '' }],
      checklist: [{ n: 1, answer: 'yes', comment: 'ok' }, { n: 2, answer: 'nesmysl', comment: '' }],
      missing_for_next_band: ['víc detailu'], strengths: ['jasné'],
    })),
  };
};

test('přihlášení a přehled IA (SEHS má rubriku, AI vypnutá bez klíče)', async () => {
  const login = await request(app).post('/api/auth/login').send({ email: 'student@example.com', password: 'Docasne1' });
  token = login.body.data.token;
  assert.equal((await request(app).get('/api/ia')).status, 401);

  const res = await api('get', '/api/ia');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.aiAvailable, false);
  const codes = res.body.data.subjects.map((s) => s.code);
  assert.deepEqual(codes, ['SEHS']);
  assert.equal(res.body.data.subjects[0].maxWords, 3200);
});

test('rubrika: 4 kritéria po 6 bodech, 24 celkem, checklisty a pásma', () => {
  const r = rubrics.SEHS;
  assert.equal(r.criteria.length, 4);
  assert.equal(r.criteria.reduce((s, c) => s + c.max, 0), r.totalMarks);
  assert.deepEqual(r.criteria.map((c) => c.checklist.length), [16, 12, 7, 5]);
  for (const c of r.criteria) assert.deepEqual(c.bands.map((b) => b.marks), ['0', '1-2', '3-4', '5-6']);
});

test('výzkumná otázka se uloží a přepíše', async () => {
  const subjectId = getDb().prepare("SELECT id FROM subjects WHERE code = 'SEHS'").get().id;
  let res = await api('put', `/api/ia/subjects/${subjectId}/research-question`).send({ researchQuestion: '  To what extent does X affect Y?  ' });
  assert.equal(res.status, 200);
  res = await api('put', `/api/ia/subjects/${subjectId}/research-question`).send({ researchQuestion: 'To what extent does time into a plank affect EMG?' });
  const ov = await api('get', '/api/ia');
  assert.equal(ov.body.data.subjects[0].researchQuestion, 'To what extent does time into a plank affect EMG?');
  assert.equal((await api('put', `/api/ia/subjects/${subjectId}/research-question`).send({ researchQuestion: 'x'.repeat(2001) })).status, 422);
  assert.equal((await api('put', '/api/ia/subjects/99999/research-question').send({ researchQuestion: 'a' })).status, 404);
});

test('bez API klíče se AI kontrola odmítne', async () => {
  const subjectId = getDb().prepare("SELECT id FROM subjects WHERE code = 'SEHS'").get().id;
  const res = await api('post', `/api/ia/subjects/${subjectId}/review-report`).send({ source: 'paste', text: 'slovo '.repeat(100) });
  assert.equal(res.status, 503);
});

test('kontrola výzkumné otázky přes AI (otázka je pevná, hodnotí se, co musí udělat zpráva)', async (t) => {
  const subjectId = getDb().prepare("SELECT id FROM subjects WHERE code = 'SEHS'").get().id;
  const client = fakeClient(() => ({
    summary: 'Chybí nejistota.', strengths: ['dobré úrovně IV'],
    gaps: [
      { aspect: 'Uncertainty', severity: 'high', risk: 'prázdné ±', address_in_report: 'uvést nejistotu v metodice', where: 'Methodology' },
      { aspect: 'X', severity: 'bogus', risk: 'r', address_in_report: 'a', where: 'Nesmysl' },
    ],
    must_define: ['activation = RMS v % MVC'], questions_to_answer: ['Jak normalizuješ?'],
  }));
  ai._setClientForTests(client);
  t.after(() => ai._setClientForTests(null));

  const start = await api('post', `/api/ia/subjects/${subjectId}/review-research-question`);
  assert.equal(start.status, 201);
  const done = await waitFor(start.body.data.id);
  assert.equal(done.status, 'done');
  assert.equal(done.result.gaps[0].addressInReport, 'uvést nejistotu v metodice');
  assert.equal(done.result.gaps[1].severity, 'medium', 'neplatná závažnost se opraví');
  assert.equal(done.result.gaps[1].where, 'Methodology', 'neplatná sekce se opraví');
  assert.deepEqual(done.result.mustDefine, ['activation = RMS v % MVC']);
  assert.equal(done.result.improvedStructure, undefined, 'žádná kostra k přepsání otázky');
  const prompt = client.calls[0].messages[0].content[0].text;
  assert.match(prompt, /To what extent does time into a plank/);
  assert.match(prompt, /FIXED/);
});

test('kontrola zprávy: marks se ořežou, checklist doplní, součet se spočítá', async (t) => {
  const subjectId = getDb().prepare("SELECT id FROM subjects WHERE code = 'SEHS'").get().id;
  const client = fakeClient(reportInput);
  ai._setClientForTests(client);
  t.after(() => ai._setClientForTests(null));

  const text = 'The investigation measures muscle activity during a plank. '.repeat(30) + '\nReferences\nSmith 2020 ' + 'zdroj '.repeat(50);
  const start = await api('post', `/api/ia/subjects/${subjectId}/review-report`)
    .send({ source: 'paste', text, criteria: ['research_design', 'evaluation'] });
  assert.equal(start.status, 201);
  assert.ok(start.body.data.countedWords < start.body.data.wordCount, 'bibliografie se do odhadu nepočítá');

  const done = await waitFor(start.body.data.id);
  assert.equal(done.status, 'done');
  assert.deepEqual(done.result.criteria.map((c) => c.id), ['research_design', 'evaluation']);
  const rd = done.result.criteria[0];
  assert.equal(rd.marks, 6, '9 se ořízne na max 6');
  assert.equal(rd.band, '5-6');
  assert.equal(rd.checklist.length, 16);
  assert.equal(rd.checklist[1].answer, 'unclear', 'neplatná odpověď → unclear');
  assert.equal(rd.descriptors.length, 3);
  assert.equal(done.result.criteria[1].descriptors.length, 2);
  assert.equal(done.result.totalMarks, 10);
  assert.equal(done.result.totalMax, 12);
  assert.ok(client.calls[0].messages[0].content[1].text.includes('<report>'));

  const ov = await api('get', '/api/ia');
  const last = ov.body.data.subjects[0].reviews.find((r) => r.id === start.body.data.id);
  assert.equal(last.totalMarks, 10);
  assert.equal((await api('delete', `/api/ia/reviews/${last.id}`)).status, 200);
  assert.equal((await api('get', `/api/ia/reviews/${last.id}`)).status, 404);
});

test('chyba modelu se uloží jako srozumitelná chyba', async (t) => {
  const subjectId = getDb().prepare("SELECT id FROM subjects WHERE code = 'SEHS'").get().id;
  ai._setClientForTests(fakeClient('fail'));
  t.after(() => ai._setClientForTests(null));
  const start = await api('post', `/api/ia/subjects/${subjectId}/review-report`).send({ source: 'paste', text: 'slovo '.repeat(80) });
  const done = await waitFor(start.body.data.id);
  assert.equal(done.status, 'error');
  assert.match(done.error, /API key/);
});

test('PDF se posílá modelu jako dokument', async (t) => {
  const subjectId = getDb().prepare("SELECT id FROM subjects WHERE code = 'SEHS'").get().id;
  const client = fakeClient(reportInput);
  ai._setClientForTests(client);
  t.after(() => ai._setClientForTests(null));
  const pdf = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample.pdf')).toString('base64');
  const start = await api('post', `/api/ia/subjects/${subjectId}/review-report`)
    .send({ source: 'file', file: { name: 'ia.pdf', mimeType: 'application/pdf', dataBase64: pdf }, criteria: ['conclusion'] });
  assert.equal(start.status, 201, JSON.stringify(start.body));
  await waitFor(start.body.data.id);
  assert.equal(client.calls[0].messages[0].content[1].type, 'document');
});

test('extrakce: počítání slov, nepodporovaný soubor, soukromý Google Doc', async (t) => {
  assert.equal(countWords('a b  c\nd'), 4);
  assert.equal(estimateCountedWords('Text of the report goes here\nTime\tHR\tBP\n10 20 30 40\nReferences\nDoe 2020 something'), 6);
  await assert.rejects(extract({ source: 'file', file: { name: 'a.txt', dataBase64: Buffer.from('hello').toString('base64') } }), { status: 415 });
  await assert.rejects(extract({ source: 'paste', text: 'krátké' }), { status: 422 });
  await assert.rejects(extract({ source: 'gdoc', url: 'https://evil.example.com/document/d/abc' }), { status: 400 });

  const realFetch = global.fetch;
  t.after(() => { global.fetch = realFetch; });
  const id = 'A'.repeat(30);
  global.fetch = async () => ({ ok: true, headers: { get: () => 'text/html; charset=utf-8' }, text: async () => '<html>login</html>' });
  await assert.rejects(extract({ source: 'gdoc', url: `https://docs.google.com/document/d/${id}/edit` }), { status: 422 });
  global.fetch = async () => ({ ok: true, headers: { get: () => 'text/plain' }, text: async () => '﻿' + 'word '.repeat(60) });
  const r = await extract({ source: 'gdoc', url: `https://docs.google.com/document/d/${id}/edit` });
  assert.equal(r.source, 'gdoc');
  assert.equal(r.wordCount, 60);
});

test('model, který nevolá nástroj, dostane jednu připomínku; požadavek nevynucuje tool_choice', async (t) => {
  const subjectId = getDb().prepare("SELECT id FROM subjects WHERE code = 'SEHS'").get().id;
  const calls = [];
  ai._setClientForTests({
    messages: {
      create: async (req) => {
        calls.push(req);
        if (calls.length === 1) return { content: [{ type: 'text', text: 'Here is my feedback in plain text.' }] };
        return { content: [{ type: 'tool_use', name: req.tools[0].name, input: reportInput(req) }] };
      },
    },
  });
  t.after(() => ai._setClientForTests(null));
  const start = await api('post', `/api/ia/subjects/${subjectId}/review-report`).send({ source: 'paste', text: 'word '.repeat(80), criteria: ['conclusion'] });
  const done = await waitFor(start.body.data.id);
  assert.equal(done.status, 'done');
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].tool_choice, { type: 'auto' });
  assert.equal(calls[1].messages.at(-1).role, 'user');
});
