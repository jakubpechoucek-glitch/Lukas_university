const router = require('express').Router();
const ctrl = require('../controllers/student.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/student', ctrl.getData);
router.put('/subjects/:id', ctrl.updateSubject);
router.post('/scenarios', ctrl.createScenario);
router.put('/scenarios/:id', ctrl.updateScenario);
router.post('/scenarios/:id/activate', ctrl.activateScenario);
router.delete('/scenarios/:id', ctrl.deleteScenario);
router.post('/assessments', ctrl.createAssessment);
router.put('/assessments/:id', ctrl.updateAssessment);
router.delete('/assessments/:id', ctrl.deleteAssessment);

module.exports = router;
