const service = require('../services/ia.service');
const { success, created, error } = require('../utils/response');
const { idParam } = require('../utils/handle');

// Ruční obálka kvůli async handlerům (utils/handle.js je synchronní).
const wrap = (fn, ok = success) => async (req, res) => {
  try {
    ok(res, await fn(req));
  } catch (err) {
    if (!err?.status) console.error(err);
    error(res, err?.message || 'Internal server error', err?.status || 500);
  }
};

module.exports = {
  overview: wrap(() => service.overview()),
  setResearchQuestion: wrap((req) => service.setResearchQuestion(idParam(req), req.body?.researchQuestion)),
  reviewResearchQuestion: wrap((req) => service.startRqReview(idParam(req)), created),
  reviewReport: wrap((req) => service.startReportReview(idParam(req), req.body), created),
  getReview: wrap((req) => service.getReview(idParam(req))),
  deleteReview: wrap((req) => { service.deleteReview(idParam(req)); return { deleted: true }; }),
};
