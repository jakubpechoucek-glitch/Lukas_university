const { getDb } = require('../../db/db');
const rubrics = require('../../shared/ia/rubrics.json');
const ai = require('./ia-ai.service');
const { extract } = require('./ia-extract.service');

const MAX_RQ_CHARS = 2000;
const STALE_MINUTES = 10;

const fail = (status, message) => { throw { status, message }; };

function subjectWithRubric(subjectId) {
  const s = getDb().prepare('SELECT id, code, display_name, level FROM subjects WHERE id = ?').get(subjectId);
  if (!s) fail(404, 'Subject does not exist');
  if (!rubrics[s.code]) fail(404, 'There is no rubric for this subject yet');
  return s;
}

const parse = (json) => { try { return json ? JSON.parse(json) : null; } catch { return null; } };

function toSummary(r) {
  const result = parse(r.result_json);
  return {
    id: r.id, subjectId: r.subject_id, kind: r.kind, status: r.status, source: r.source,
    criteria: parse(r.criteria), wordCount: r.word_count, createdAt: r.created_at, finishedAt: r.finished_at,
    totalMarks: r.kind === 'report' ? result?.totalMarks ?? null : null,
    totalMax: r.kind === 'report' ? result?.totalMax ?? null : null,
  };
}

function overview() {
  const db = getDb();
  const subjects = db.prepare('SELECT id, code, display_name, level FROM subjects ORDER BY sort_order, id').all()
    .filter((s) => rubrics[s.code])
    .map((s) => ({
      subjectId: s.id, code: s.code, displayName: s.display_name, level: s.level,
      researchQuestion: db.prepare('SELECT research_question FROM ia_projects WHERE subject_id = ?').get(s.id)?.research_question ?? '',
      maxWords: rubrics[s.code].maxWords,
      reviews: db.prepare(
        'SELECT id, subject_id, kind, status, source, criteria, word_count, result_json, created_at, finished_at FROM ia_reviews WHERE subject_id = ? ORDER BY id DESC LIMIT 50'
      ).all(s.id).map(toSummary),
    }));
  return { aiAvailable: ai.isAvailable(), subjects };
}

function setResearchQuestion(subjectId, researchQuestion) {
  subjectWithRubric(subjectId);
  const text = String(researchQuestion ?? '').trim();
  if (text.length > MAX_RQ_CHARS) fail(422, `The research question is too long (max. ${MAX_RQ_CHARS} characters)`);
  getDb().prepare(`
    INSERT INTO ia_projects (subject_id, research_question, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(subject_id) DO UPDATE SET research_question = excluded.research_question, updated_at = datetime('now')
  `).run(subjectId, text);
  return { subjectId, researchQuestion: text };
}

const researchQuestionOf = (subjectId) =>
  getDb().prepare('SELECT research_question FROM ia_projects WHERE subject_id = ?').get(subjectId)?.research_question ?? '';

function humanError(err) {
  if (err && !(err instanceof Error) && err.status && err.message) return err.message; // naše chyby (prosté objekty); chyby SDK jsou Error
  if (err?.status === 401) return 'Invalid or missing API key (ANTHROPIC_API_KEY)';
  if (err?.status === 429) return 'The service is overloaded or the usage limit is reached, please try again in a moment';
  if (err?.status === 413 || err?.status === 400) return 'The model did not accept the document (too large or unreadable). Try pasting the text.';
  return 'The evaluation failed, please try again';
}

/** Spustí práci na pozadí. Klient si výsledek vyzvedává dotazováním (GET /ia/reviews/:id). */
function runInBackground(reviewId, job) {
  const db = getDb();
  Promise.resolve().then(job).then(({ model, result }) => {
    db.prepare("UPDATE ia_reviews SET status = 'done', result_json = ?, model = ?, finished_at = datetime('now') WHERE id = ?")
      .run(JSON.stringify(result), model, reviewId);
  }).catch((err) => {
    console.error('IA review selhalo:', err?.message || err);
    try {
      db.prepare("UPDATE ia_reviews SET status = 'error', error = ?, finished_at = datetime('now') WHERE id = ?")
        .run(humanError(err), reviewId);
    } catch { /* DB mezitím zavřená (konec procesu/testu) */ }
  });
}

function requireAi() {
  if (!ai.isAvailable()) fail(503, 'AI review is not enabled: ANTHROPIC_API_KEY is missing on the server');
}

function startRqReview(subjectId) {
  const s = subjectWithRubric(subjectId);
  requireAi();
  const rq = researchQuestionOf(subjectId);
  if (rq.length < 10) fail(422, 'Save the research question first');
  const id = getDb().prepare("INSERT INTO ia_reviews (subject_id, kind, input_text) VALUES (?, 'rq', ?)").run(subjectId, rq).lastInsertRowid;
  runInBackground(id, () => ai.reviewResearchQuestion({ subjectCode: s.code, researchQuestion: rq }));
  return { id: Number(id), status: 'pending' };
}

async function startReportReview(subjectId, body = {}) {
  const s = subjectWithRubric(subjectId);
  requireAi();
  const all = rubrics[s.code].criteria.map((c) => c.id);
  const criteria = Array.isArray(body.criteria) && body.criteria.length ? all.filter((id) => body.criteria.includes(id)) : all;
  if (!criteria.length) fail(400, 'Select at least one criterion');

  const report = await extract(body);
  const id = getDb().prepare(
    "INSERT INTO ia_reviews (subject_id, kind, source, criteria, word_count, input_text) VALUES (?, 'report', ?, ?, ?, ?)"
  ).run(subjectId, report.source, JSON.stringify(criteria), report.wordCount, report.text).lastInsertRowid;

  runInBackground(id, () => ai.reviewReport({
    subjectCode: s.code, criteriaIds: criteria, researchQuestion: researchQuestionOf(subjectId),
    report, wordCount: report.wordCount, countedWords: report.countedWords,
  }));
  return { id: Number(id), status: 'pending', wordCount: report.wordCount, countedWords: report.countedWords };
}

function getReview(id) {
  const db = getDb();
  const r = db.prepare('SELECT * FROM ia_reviews WHERE id = ?').get(id);
  if (!r) fail(404, 'Review does not exist');
  if (r.status === 'pending' && Date.now() - new Date(r.created_at.replace(' ', 'T') + 'Z') > STALE_MINUTES * 60000) {
    db.prepare("UPDATE ia_reviews SET status = 'error', error = ?, finished_at = datetime('now') WHERE id = ?")
      .run('The evaluation was interrupted (server restart or time limit), please run it again', id);
    r.status = 'error';
    r.error = 'The evaluation was interrupted (server restart or time limit), please run it again';
  }
  return { ...toSummary(r), error: r.error, model: r.model, result: parse(r.result_json), researchQuestion: r.kind === 'rq' ? r.input_text : null };
}

function deleteReview(id) {
  const info = getDb().prepare('DELETE FROM ia_reviews WHERE id = ?').run(id);
  if (!info.changes) fail(404, 'Review does not exist');
}

module.exports = { overview, setResearchQuestion, startRqReview, startReportReview, getReview, deleteReview };
