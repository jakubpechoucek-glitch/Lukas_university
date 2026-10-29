const service = require('../services/catalog.service');
const { handle, idParam } = require('../utils/handle');

module.exports = {
  getCatalog: handle(() => service.getCatalog()),
  createUniversity: handle((req) => service.createUniversity(req.body), { status: 201 }),
  updateUniversity: handle((req) => service.updateUniversity(idParam(req), req.body)),
  deleteUniversity: handle((req) => service.deleteUniversity(idParam(req)), { status: 204 }),
  createProgram: handle((req) => service.createProgram(req.body), { status: 201 }),
  updateProgram: handle((req) => service.updateProgram(idParam(req), req.body)),
  deleteProgram: handle((req) => service.deleteProgram(idParam(req)), { status: 204 }),
};
