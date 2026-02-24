// Global error handling middleware.
// Catches errors passed via next(err), logs with timestamp, returns JSON 500 response.

function getTimestamp() {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

function errorHandler(err, req, res, next) {
  const message = err.message || "Internal Server Error";
  console.error(`[${getTimestamp()}] ERROR: ${message}`);
  if (err.stack) console.error(err.stack);
  const statusCode = err.status || 500;
  res.status(statusCode).json({ error: "Something went wrong", details: message });
}

module.exports = errorHandler;
