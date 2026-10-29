const success = (res, data, statusCode = 200) =>
  res.status(statusCode).json({ success: true, data });

const created = (res, data) => success(res, data, 201);

const error = (res, message, statusCode = 400, details = null) =>
  res.status(statusCode).json({ success: false, error: message, ...(details && { details }) });

const notFound = (res, message = 'Resource not found') => error(res, message, 404);
const forbidden = (res, message = 'Access denied') => error(res, message, 403);
const unauthorized = (res, message = 'Authentication required') => error(res, message, 401);
const conflict = (res, message) => error(res, message, 409);
const serverError = (res, message = 'Internal server error') => error(res, message, 500);

module.exports = { success, created, error, notFound, forbidden, unauthorized, conflict, serverError };
