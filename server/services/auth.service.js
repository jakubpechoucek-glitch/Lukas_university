const crypto = require('crypto');
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

// Přihlášení přes Rozcestník: Rozcestník předá přístupový token Supabase,
// ověříme ho přímo u Supabase a pustíme jen e-mail, který tu má účet.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://unoefgbzymlwwehgzusf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_0slnWPDezyFgiOmUGDal4Q_B5ZGz7i_'; // veřejný publishable klíč

async function supabaseRpc(fn, accessToken) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(10000),
    });
    return res.ok ? await res.json() : null;
  } catch {
    throw { status: 502, message: 'Rozcestník (Supabase) teď neodpovídá, zkuste to znovu' };
  }
}

async function loginWithSupabase(accessToken) {
  if (!accessToken || typeof accessToken !== 'string' || accessToken.length > 4096) {
    throw { status: 400, message: 'Chybí token z Rozcestníku' };
  }

  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw { status: 502, message: 'Rozcestník (Supabase) teď neodpovídá, zkuste to znovu' };
  }
  if (!res.ok) {
    throw { status: 401, message: 'Přihlášení z Rozcestníku vypršelo, přihlaste se znovu' };
  }

  const sbUser = await res.json();
  if (!sbUser?.email || !sbUser.email_confirmed_at) {
    throw { status: 401, message: 'Účet na Rozcestníku nemá ověřený e-mail' };
  }

  const email = String(sbUser.email).trim();
  let user = usersRepo.findByEmail(email);
  if (!user) {
    // Člen rodiny z tabulky `clenove` v Supabase (je_clen) smí dovnitř i bez účtu v BOOTSTRAP_USERS – založí se mu.
    const member = await supabaseRpc('je_clen', accessToken);
    if (member !== true) {
      throw { status: 403, message: `Účet ${email} nemá v Lukas University přístup` };
    }
    const jmeno = await supabaseRpc('moje_jmeno', accessToken);
    const name = typeof jmeno === 'string' && jmeno.trim() ? jmeno.trim() : email;
    const role = (process.env.SSO_STUDENT_EMAILS || '').split(',')
      .map((e) => e.trim().toLowerCase()).includes(email.toLowerCase()) ? 'student' : 'parent';
    // Heslo se nepoužívá (přihlašuje se přes Rozcestník); náhodné, aby účet nešel uhodnout.
    const passwordHash = bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), BCRYPT_ROUNDS);
    usersRepo.create({ name, email, passwordHash, role, isFirstLogin: 0 });
    user = usersRepo.findByEmail(email);
    console.log(`  ✓ Účet vytvořen přes Rozcestník: ${name} (${role})`);
  }
  if (!user.is_active) {
    throw { status: 403, message: 'Účet je deaktivovaný' };
  }

  usersRepo.resetLoginAttempts(user.id);
  return { token: issueToken(user), user: publicUser(user) };
}

function me(userId) {
  const user = usersRepo.findById(userId);
  if (!user) throw { status: 404, message: 'Uživatel neexistuje' };
  return publicUser(user);
}

module.exports = { login, loginWithSupabase, changePassword, me, PASSWORD_POLICY };
