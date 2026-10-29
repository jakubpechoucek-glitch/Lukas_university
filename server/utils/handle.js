const { success, created, error } = require('./response');

// Obalí handler: vrácená hodnota → 200/201, vyhozené { status, message } → chybová odpověď.
function handle(fn, { status = 200 } = {}) {
  return (req, res) => {
    try {
      const data = fn(req);
      if (status === 204) return res.status(204).end();
      return status === 201 ? created(res, data) : success(res, data);
    } catch (err) {
      if (err?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') return error(res, 'Odkazovaný záznam neexistuje', 422);
      if (!err?.status) console.error(err);
      return error(res, err?.message || 'Internal server error', err?.status || 500);
    }
  };
}

const idParam = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw { status: 400, message: 'Neplatné ID' };
  return id;
};

module.exports = { handle, idParam };
