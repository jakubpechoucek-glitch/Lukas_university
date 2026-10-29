const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usersRepo = require('../repositories/users.repository');

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function issueToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, isFirstLogin: !!user.is_first_login };
}

async function login(email, password) {
  const user = email ? usersRepo.findByEmail(String(email).trim()) : null;
  if (!user || !password) {
    throw { status: 401, message: 'Nesprávný e-mail nebo heslo' };
  }

  if (!user.is_active) {
    throw { status: 403, message: 'Účet je deaktivovaný' };
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minutes = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    throw { status: 429, message: `Účet je dočasně zamčený, zkuste to znovu za ${minutes} min.` };
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    usersRepo.incrementFailedLogin(user.id);
    const updated = usersRepo.findById(user.id);
    if (updated.failed_login_count >= MAX_ATTEMPTS) {
      usersRepo.lockAccount(user.id, new Date(Date.now() + LOCK_MINUTES * 60000).toISOString());
      throw { status: 429, message: `Příliš mnoho pokusů, účet je zamčený na ${LOCK_MINUTES} minut.` };
    }
    throw { status: 401, message: 'Nesprávný e-mail nebo heslo' };
  }

  usersRepo.resetLoginAttempts(user.id);
  return { token: issueToken(user), user: publicUser(user) };
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = usersRepo.findById(userId);
  if (!user) throw { status: 404, message: 'Uživatel neexistuje' };

  // Při prvním přihlášení se dočasné heslo už ověřilo loginem.
  if (!user.is_first_login) {
    const full = usersRepo.findByEmail(user.email);
    const valid = await bcrypt.compare(currentPassword || '', full.password_hash);
    if (!valid) throw { status: 401, message: 'Současné heslo není správné' };
  }

  if (!PASSWORD_POLICY.test(newPassword || '')) {
    throw { status: 422, message: 'Heslo musí mít aspoň 8 znaků, velké a malé písmeno a číslici' };
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  usersRepo.updatePassword(userId, hash);
}

function me(userId) {
  const user = usersRepo.findById(userId);
  if (!user) throw { status: 404, message: 'Uživatel neexistuje' };
  return publicUser(user);
}

module.exports = { login, changePassword, me, PASSWORD_POLICY };
