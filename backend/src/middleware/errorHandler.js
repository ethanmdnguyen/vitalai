// Global error handling middleware.
// Catches errors passed via next(err) and returns a JSON error response.

function errorHandler(err, req, res, next) {
  console.error(err.stack);
  const statusCode = err.status || 500;
  res.status(statusCode).json({ error: err.message || "Internal Server Error" });
}

module.exports = errorHandler;
