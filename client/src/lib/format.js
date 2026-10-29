export const STATUS_META = {
  meets: { icon: '✅', label: 'Splňuje', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  borderline: { icon: '⚠️', label: 'Hraniční', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  fails: { icon: '❌', label: 'Nesplňuje', cls: 'text-red-700 bg-red-50 border-red-200' },
  unknown: { icon: '❔', label: 'Nelze určit', cls: 'text-slate-600 bg-slate-50 border-slate-200' },
};

export const PROGRAM_STATUSES = {
  research: 'K prozkoumání',
  considering: 'Zvažuji',
  applying: 'Hlásím se',
  applied: 'Podáno',
  offer_conditional: 'Conditional offer',
  offer_unconditional: 'Unconditional offer',
  rejected: 'Odmítnuto',
  accepted: 'Přijato',
  dropped: 'Vyřazeno',
};

export const COUNTRIES = {
  GB: '🇬🇧 UK', IE: '🇮🇪 Irsko', NL: '🇳🇱 Nizozemsko', DK: '🇩🇰 Dánsko', SE: '🇸🇪 Švédsko',
  CH: '🇨🇭 Švýcarsko', ES: '🇪🇸 Španělsko', DE: '🇩🇪 Německo', FR: '🇫🇷 Francie', IT: '🇮🇹 Itálie',
  CZ: '🇨🇿 Česko', AT: '🇦🇹 Rakousko', BE: '🇧🇪 Belgie', FI: '🇫🇮 Finsko', NO: '🇳🇴 Norsko', PT: '🇵🇹 Portugalsko',
};

export const countryLabel = (code) => COUNTRIES[code] ?? code ?? '';

export function money(amount, currency) {
  if (amount === null || amount === undefined) return '';
  try {
    return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: currency || 'EUR', maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency ?? ''}`;
  }
}

export function marginText(margin) {
  if (margin === null || margin === undefined) return '';
  if (margin === -Infinity) return '✗';
  return margin > 0 ? `+${margin}` : String(margin);
}

const subjectsText = (codes) => codes.join(', ');

/** Krátký lidsky čitelný popis sady požadavků. */
export function describeSet(set) {
  const parts = [];
  if (set.minTotal !== null && set.minTotal !== undefined) parts.push(`${set.minTotal} b.${set.totalBasis === 'subjects_only' ? ' (bez TOK/EE)' : ''}`);
  if (set.hlProfile?.length) parts.push(`HL ${set.hlProfile.join('-')}`);
  if (set.minHlSum !== null && set.minHlSum !== undefined) parts.push(`ΣHL ≥ ${set.minHlSum}`);
  if (set.minEachSubject !== null && set.minEachSubject !== undefined) parts.push(`vše ≥ ${set.minEachSubject}`);
  for (const r of set.subjectRules ?? []) {
    const lvl = r.level === 'ANY' ? '' : `${r.level} `;
    const cnt = r.count > 1 ? `${r.count}× ` : '';
    parts.push(`${cnt}${lvl}≥${r.minGrade} z ${subjectsText(r.subjects)}`);
  }
  return parts.join(' · ') || '—';
}

export function describeRequirements(program) {
  const sets = program.requirementSets ?? [];
  const typical = sets.filter((s) => s.kind !== 'contextual');
  if (program.manualReview) return 'ruční posouzení';
  if (!typical.length) return '—';
  return typical.map(describeSet).join('  |  nebo  ');
}

export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${Number(d)}. ${Number(m)}. ${y}`;
}

export const TERMS = ['G11-S1', 'G11-S2', 'G12-S1', 'G12-S2'];
