const service = require('../services/student.service');
const { handle, idParam } = require('../utils/handle');

module.exports = {
  getData: handle(() => service.getData()),
  updateSubject: handle((req) => service.updateSubject(idParam(req), req.body)),
  createScenario: handle((req) => service.createScenario(req.body), { status: 201 }),
  updateScenario: handle((req) => service.updateScenario(idParam(req), req.body)),
  activateScenario: handle((req) => service.activateScenario(idParam(req))),
  deleteScenario: handle((req) => service.deleteScenario(idParam(req))),
  createAssessment: handle((req) => service.createAssessment(req.body), { status: 201 }),
  updateAssessment: handle((req) => service.updateAssessment(idParam(req), req.body)),
  deleteAssessment: handle((req) => service.deleteAssessment(idParam(req)), { status: 204 }),
};
