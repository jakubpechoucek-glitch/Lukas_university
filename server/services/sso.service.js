// Přihlášení přes rozcestník (Supabase). Rozcestník předá přístupový token Supabase,
// server ho ověří u Supabase a pustí jen e-maily z tabulky `clenove` (funkce je_clen).
// Pak najde (nebo založí) místní účet a vydá vlastní JWT jako při přihlášení heslem.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const usersRepo = require('../repositories/users.repository');
const { issueToken, publicUser } = require('./auth.service');

// Veřejné hodnoty (stejné jako v rozcestnik/auth.js), lze přepsat proměnnými prostředí.
const DEFAULT_SUPABASE_URL = 'https://unoefgbzymlwwehgzusf.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_0slnWPDezyFgiOmUGDal4Q_B5ZGz7i_';

function config() {
  return {
    url: (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, ''),
    key: process.env.SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_KEY,
  };
}

async function supabase(path, token, options = {}) {
  const { url, key } = config();
  try {
    return await fetch(url + path, {
      ...options,
      headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw { status: 502, message: 'Přihlášení přes rozcestník se nepodařilo ověřit, zkuste to znovu' };
  }
}

function studentEmails() {
  return (process.env.SSO_STUDENT_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

async function loginWithSupabaseToken(token) {
  if (!token || typeof token !== 'string' || token.length > 4096) {
    throw { status: 401, message: 'Chybí přihlašovací token' };
  }

  const userRes = await supabase('/auth/v1/user', token);
  if (!userRes.ok) throw { status: 401, message: 'Přihlášení vypršelo, přihlaste se znovu přes rozcestník' };
  const sbUser = await userRes.json();
  const email = String(sbUser.email || '').trim();
  if (!email) throw { status: 401, message: 'Účet nemá e-mail' };

  const memberRes = await supabase('/rest/v1/rpc/je_clen', token, { method: 'POST', body: '{}' });
  if (!memberRes.ok || (await memberRes.json()) !== true) {
    throw { status: 403, message: `Účet ${email} není mezi členy rodiny` };
  }

  let user = usersRepo.findByEmail(email);
  if (!user) {
    let name = email;
    const nameRes = await supabase('/rest/v1/rpc/moje_jmeno', token, { method: 'POST', body: '{}' });
    if (nameRes.ok) {
      const n = await nameRes.json();
      if (typeof n === 'string' && n.trim()) name = n.trim();
    }
    const role = studentEmails().includes(email.toLowerCase()) ? 'student' : 'parent';
    // Heslo se nepoužívá (přihlašuje se přes rozcestník); náhodné, aby účet nešel uhodnout.
    const passwordHash = bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), 10);
    usersRepo.create({ name, email, passwordHash, role, isFirstLogin: 0 });
    user = usersRepo.findByEmail(email);
    console.log(`  ✓ Účet vytvořen přes SSO: ${name} (${role})`);
  }

  if (!user.is_active) throw { status: 403, message: 'Účet je deaktivovaný' };
  return { token: issueToken(user), user: publicUser({ ...user, is_first_login: 0 }) };
}

module.exports = { loginWithSupabaseToken };
