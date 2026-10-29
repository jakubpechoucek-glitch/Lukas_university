const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lukas-test-'));
process.env.DATABASE_URL = path.join(tmpDir, 'test.db');
process.env.JWT_SECRET = 'test-secret';
process.env.BCRYPT_ROUNDS = '4';
process.env.BOOTSTRAP_USERS = 'Rodič|rodic@example.com|parent;Student|student@example.com|student';
process.env.INITIAL_PASSWORD = 'Docasne1';

const request = require('supertest');
const app = require('../server/index');
const { closeDb, getDb } = require('../db/db');
const { parseBootstrapUsers, bootstrap } = require('../db/bootstrap');

after(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function login(email, password) {
  return request(app).post('/api/auth/login').send({ email, password });
}

test('health', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
});

test('bootstrap vytvoří účty, obory, předměty a scénáře (idempotentně)', () => {
  bootstrap();
  const db = getDb();
  assert.equal(db.prepare('SELECT COUNT(*) n FROM users').get().n, 2);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM fields').get().n, 4);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM subjects').get().n, 6);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM scenarios').get().n, 6);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM scenarios WHERE source = 'averages'").get().n, 1, 'scénář podle průměrů jen jednou');
  assert.equal(db.prepare('SELECT name FROM scenarios WHERE is_active = 1').get().name, 'moje predikce');
});

test('parseBootstrapUsers odmítne neplatnou roli', () => {
  assert.throws(() => parseBootstrapUsers('A|a@b.c|admin'));
  assert.deepEqual(parseBootstrapUsers(' A|a@b.c|student ; '), [{ name: 'A', email: 'a@b.c', role: 'student' }]);
});

test('API bez přihlášení vrací 401', async () => {
  const res = await request(app).get('/api/fields');
  assert.equal(res.status, 401);
});

test('špatné heslo → 401', async () => {
  const res = await login('rodic@example.com', 'spatne');
  assert.equal(res.status, 401);
});

test('první přihlášení, změna hesla a přístup k API', async () => {
  let res = await login('RODIC@example.com', 'Docasne1');
  assert.equal(res.status, 200, 'e-mail nezáleží na velikosti písmen');
  assert.equal(res.body.data.user.isFirstLogin, true);
  assert.equal(res.body.data.user.role, 'parent');
  const token = res.body.data.token;

  res = await request(app).post('/api/auth/change-password')
    .set('Authorization', `Bearer ${token}`).send({ newPassword: 'slabe' });
  assert.equal(res.status, 422);

  res = await request(app).post('/api/auth/change-password')
    .set('Authorization', `Bearer ${token}`).send({ newPassword: 'NoveHeslo1' });
  assert.equal(res.status, 200);

  res = await login('rodic@example.com', 'NoveHeslo1');
  assert.equal(res.body.data.user.isFirstLogin, false);

  // Po první změně je nutné zadat současné heslo.
  res = await request(app).post('/api/auth/change-password')
    .set('Authorization', `Bearer ${token}`).send({ currentPassword: 'spatne', newPassword: 'JesteNove2' });
  assert.equal(res.status, 401);

  res = await request(app).get('/api/fields').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.map((f) => f.name),
    ['Sport Science', 'Sport Management', 'Physiotherapy', 'Business Management']);
});
