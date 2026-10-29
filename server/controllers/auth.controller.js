const authService = require('../services/auth.service');
const { success, error } = require('../utils/response');

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    success(res, result);
  } catch (err) {
    error(res, err.message, err.status || 500);
  }
}

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    success(res, { message: 'Password changed successfully' });
  } catch (err) {
    error(res, err.message, err.status || 500);
  }
}

function me(req, res) {
  try {
    const user = authService.me(req.user.id);
    success(res, user);
  } catch (err) {
    error(res, err.message, err.status || 500);
  }
}

function logout(req, res) {
  // JWT is stateless; client clears token. We just confirm.
  success(res, { message: 'Logged out successfully' });
}

module.exports = { login, changePassword, me, logout };
