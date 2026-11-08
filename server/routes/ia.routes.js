const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/ia.controller');
const { authenticate } = require('../middleware/auth.middleware');

// AI volání jsou placená, proto strop na počet spuštění.
const aiLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 40, message: { success: false, error: 'Too many reviews this hour, please try again later' } });

router.use(authenticate);

router.get('/', ctrl.overview);
router.put('/subjects/:id/research-question', ctrl.setResearchQuestion);
router.post('/subjects/:id/review-research-question', aiLimiter, ctrl.reviewResearchQuestion);
router.post('/subjects/:id/review-report', aiLimiter, ctrl.reviewReport);
router.get('/reviews/:id', ctrl.getReview);
router.delete('/reviews/:id', ctrl.deleteReview);

module.exports = router;
