const { forbidden } = require('../utils/response');

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return forbidden(res);
    if (!roles.includes(req.user.role)) {
      return forbidden(res, `Requires role: ${roles.join(' or ')}`);
    }
    next();
  };
}

const requireParent = requireRole('parent');

module.exports = { requireRole, requireParent };
