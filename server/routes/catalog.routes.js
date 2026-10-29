const router = require('express').Router();
const ctrl = require('../controllers/catalog.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', ctrl.getCatalog);
router.post('/universities', ctrl.createUniversity);
router.put('/universities/:id', ctrl.updateUniversity);
router.delete('/universities/:id', ctrl.deleteUniversity);
router.post('/programs', ctrl.createProgram);
router.put('/programs/:id', ctrl.updateProgram);
router.delete('/programs/:id', ctrl.deleteProgram);

module.exports = router;
