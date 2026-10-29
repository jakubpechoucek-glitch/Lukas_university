const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { getDb } = require('../../db/db');
const { success } = require('../utils/response');

// Zatím jen čtení – plné CRUD katalogu přijde ve fázi 3.
router.get('/', authenticate, (req, res) => {
  success(res, getDb().prepare('SELECT * FROM fields ORDER BY sort_order, name').all());
});

module.exports = router;
