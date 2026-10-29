const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireParent } = require('../middleware/role.middleware');
const { getDb } = require('../../db/db');
const { importPrivate } = require('../../db/import-private');
const { success, error } = require('../utils/response');

// Jednorázový import osobních dat (formát viz docs/07-import-dat.md).
router.post('/private', authenticate, requireParent, (req, res) => {
  try {
    success(res, importPrivate(getDb(), req.body));
  } catch (err) {
    error(res, err.message, 422);
  }
});

module.exports = router;
