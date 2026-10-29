const { test, after, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lukas-crud-'));
process.env.DATABASE_URL = path.join(tmpDir, 'test.db');
process.env.JWT_SECRET = 'test-secret';
process.env.BCRYPT_ROUNDS = '4';
process.env.BOOTSTRAP_USERS = 'Student|student@example.com|student';
process.env.INITIAL_PASSWORD = 'Docasne1';

const request = require('supertest');
const app = require('../server/index');
const { closeDb } = require('../db/db');

let token;
const api = (method, url) => request(app)[method](url).set('Authorization', `Bearer ${token}`);

before(async () => {
  const res = await request(app).post('/api/auth/login').send({ email: 'student@example.com', password: 'Docasne1' });
  token = res.body.data.token;
});

after(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('katalog: načtení s požadavky', async () => {
  const res = await api('get', '/api/catalog');
  assert.equal(res.status, 200);
  const { fields, universities, programs } = res.body.data;
  assert.equal(fields.length, 4);
  assert.equal(universities.length, 36);
  assert.equal(programs.length, 67);
  const bath = programs.find((p) => p.name === 'Health and Exercise Science BSc');
  assert.equal(bath.requirementSets.length, 2);
  assert.deepEqual(bath.requirementSets[1].hlProfile, [7, 6, 5]);
  assert.equal(bath.requirementSets[0].subjectRules[0].minGrade, 6);
});

test('katalog: přidání univerzity a programu s požadavky, úprava, smazání', async () => {
  let res = await api('post', '/api/catalog/universities').send({ name: 'University of Warwick 2', country: 'gb', worldRankText: '69' });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.country, 'GB');
  assert.equal(res.body.data.worldRankSort, 69);
  const uniId = res.body.data.id;

  res = await api('post', '/api/catalog/programs').send({
    universityId: uniId, fieldId: 2, name: 'Management BSc', tuitionFee: '30000', tuitionCurrency: 'GBP',
    requirementSets: [{ minTotal: 38, hlProfile: [6, 6, 6], subjectRules: [{ subjects: ['MATH'], level: 'ANY', minGrade: 6 }] }],
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const program = res.body.data;
  assert.equal(program.tuitionFee, 30000);
  assert.equal(program.status, 'research');
  assert.equal(program.requirementSets[0].kind, 'typical');
  assert.equal(program.requirementSets[0].subjectRules[0].count, 1);

  res = await api('put', `/api/catalog/programs/${program.id}`).send({ status: 'applying', requirementSets: [] });
  assert.equal(res.body.data.status, 'applying');
  assert.equal(res.body.data.name, 'Management BSc', 'částečná úprava nemění ostatní pole');
  assert.equal(res.body.data.requirementSets.length, 0);

  res = await api('delete', `/api/catalog/universities/${uniId}`);
  assert.equal(res.status, 409, 'univerzitu s programy nelze smazat');
  assert.equal((await api('delete', `/api/catalog/programs/${program.id}`)).status, 204);
  assert.equal((await api('delete', `/api/catalog/universities/${uniId}`)).status, 204);
});

test('katalog: validace', async () => {
  let res = await api('post', '/api/catalog/programs').send({ universityId: 1, fieldId: 1, name: 'X', requirementSets: [{ hlProfile: [8] }] });
  assert.equal(res.status, 422);
  res = await api('post', '/api/catalog/programs').send({ universityId: 1, fieldId: 1, name: 'X', requirementSets: [{ subjectRules: [{ subjects: ['NOPE'], minGrade: 5 }] }] });
  assert.equal(res.status, 422);
  assert.match(res.body.error, /NOPE/);
  res = await api('post', '/api/catalog/programs').send({ universityId: 9999, fieldId: 1, name: 'X' });
  assert.equal(res.status, 422);
  res = await api('put', '/api/catalog/programs/99999').send({ name: 'X' });
  assert.equal(res.status, 404);
  res = await api('post', '/api/catalog/universities').send({ country: 'GB' });
  assert.equal(res.status, 422);
});

test('student: scénáře – úprava známek, kopie, aktivace, smazání', async () => {
  let res = await api('get', '/api/student');
  const { subjects, scenarios } = res.body.data;
  assert.equal(subjects.length, 6);
  assert.equal(scenarios.length, 6);
  assert.equal(scenarios.filter((s) => s.source === 'averages').length, 1);
  const active = scenarios.find((s) => s.isActive);
  assert.equal(active.name, 'moje predikce');

  const grades = Object.fromEntries(subjects.map((s) => [s.id, 6]));
  res = await api('put', `/api/scenarios/${active.id}`).send({ grades, corePoints: 2 });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.corePoints, 2);
  assert.equal(Object.values(res.body.data.grades).reduce((a, b) => a + b), 36);

  res = await api('put', `/api/scenarios/${active.id}`).send({ grades: { [subjects[0].id]: 8 } });
  assert.equal(res.status, 422);
  res = await api('put', `/api/scenarios/${active.id}`).send({ corePoints: 4 });
  assert.equal(res.status, 422);

  res = await api('post', '/api/scenarios').send({ name: 'kopie', copyFrom: active.id });
  assert.equal(res.status, 201);
  const copy = res.body.data;
  assert.equal(copy.corePoints, 2);
  assert.equal(Object.keys(copy.grades).length, 6);

  res = await api('post', `/api/scenarios/${copy.id}/activate`);
  assert.equal(res.body.data.filter((s) => s.isActive).length, 1);
  assert.equal(res.body.data.find((s) => s.isActive).id, copy.id);

  res = await api('delete', `/api/scenarios/${copy.id}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.filter((s) => s.isActive).length, 1, 'po smazání aktivního se aktivuje jiný');
});

test('student: scénář podle průměrů – známky nejdou měnit, nejde smazat, jde aktivovat', async () => {
  const { subjects, scenarios } = (await api('get', '/api/student')).body.data;
  const avg = scenarios.find((s) => s.source === 'averages');
  assert.equal(avg.name, 'podle průměrů');

  let res = await api('put', `/api/scenarios/${avg.id}`).send({ grades: { [subjects[0].id]: 6 } });
  assert.equal(res.status, 422);
  res = await api('put', `/api/scenarios/${avg.id}`).send({ corePoints: 2, name: 'z průměrů' });
  assert.equal(res.status, 200, 'TOK+EE a název jdou měnit');
  assert.equal(res.body.data.corePoints, 2);

  assert.equal((await api('delete', `/api/scenarios/${avg.id}`)).status, 409);
  res = await api('post', `/api/scenarios/${avg.id}/activate`);
  assert.equal(res.body.data.find((s) => s.isActive).id, avg.id);
});

test('student: assessmenty a předměty', async () => {
  const { subjects } = (await api('get', '/api/student')).body.data;
  const bio = subjects.find((s) => s.code === 'BIO');

  let res = await api('post', '/api/assessments').send({ subjectId: bio.id, term: 'G11-S2', name: 'Unit 3 KU', weight: 0.25, criterion: 'KU', dueDate: '2027-02-10' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const a = res.body.data;
  assert.equal(a.grade, null);
  assert.equal(a.sortOrder, 0);

  res = await api('put', `/api/assessments/${a.id}`).send({ grade: 6 });
  assert.equal(res.body.data.grade, 6);
  assert.equal(res.body.data.name, 'Unit 3 KU');
  res = await api('put', `/api/assessments/${a.id}`).send({ grade: null });
  assert.equal(res.body.data.grade, null, 'známku lze smazat');

  assert.equal((await api('put', `/api/assessments/${a.id}`).send({ weight: 2 })).status, 422);
  assert.equal((await api('put', `/api/assessments/${a.id}`).send({ dueDate: '10.2.2027' })).status, 422);
  assert.equal((await api('post', '/api/assessments').send({ subjectId: bio.id, term: 'G13-S1', name: 'x', weight: 0.1 })).status, 422);

  assert.equal((await api('delete', `/api/assessments/${a.id}`)).status, 204);
  assert.equal((await api('delete', `/api/assessments/${a.id}`)).status, 404);

  res = await api('put', `/api/subjects/${bio.id}`).send({ displayName: 'Biology HL' });
  assert.equal(res.body.data.displayName, 'Biology HL');
  assert.equal(res.body.data.ismMean2025, 4.71, 'neposlaná pole zůstávají');
});
