// VitalAI Express server entry point.
// Starts the server, mounts all routes, and applies global middleware.

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const healthRouter = require("./src/routes/health");
const authRouter = require("./src/routes/auth");
const profileRouter = require("./src/routes/profile");
const plansRouter = require("./src/routes/plans");
const errorHandler = require("./src/middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/plans", plansRouter);

// Global error handler (must be last)
app.use(errorHandler);

// Only start listening when this file is run directly, not when imported by tests.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`VitalAI server running on port ${PORT}`);
  });
}

module.exports = app;
