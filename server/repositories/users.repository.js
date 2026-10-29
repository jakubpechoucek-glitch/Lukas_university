const { getDb } = require('../../db/db');

function findAll() {
  return getDb().prepare(
    'SELECT id, name, email, role, is_active, is_first_login, created_at, updated_at FROM users ORDER BY name'
  ).all();
}

function findById(id) {
  return getDb().prepare(
    'SELECT id, name, email, role, is_active, is_first_login, failed_login_count, locked_until, created_at, updated_at FROM users WHERE id = ?'
  ).get(id);
}

function findByEmail(email) {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function create({ name, email, passwordHash, role, isFirstLogin = 1 }) {
  return getDb().prepare(
    'INSERT INTO users (name, email, password_hash, role, is_first_login) VALUES (?, ?, ?, ?, ?)'
  ).run(name, email, passwordHash, role, isFirstLogin ? 1 : 0);
}

function updatePassword(id, passwordHash) {
  return getDb().prepare(
    'UPDATE users SET password_hash = ?, is_first_login = 0, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(passwordHash, id);
}

function incrementFailedLogin(id) {
  return getDb().prepare(
    'UPDATE users SET failed_login_count = failed_login_count + 1, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(id);
}

function lockAccount(id, until) {
  return getDb().prepare(
    'UPDATE users SET locked_until = ?, failed_login_count = 0, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(until, id);
}

function resetLoginAttempts(id) {
  return getDb().prepare(
    'UPDATE users SET failed_login_count = 0, locked_until = NULL, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(id);
}

module.exports = {
  findAll, findById, findByEmail, create, updatePassword,
  incrementFailedLogin, lockAccount, resetLoginAttempts,
};
