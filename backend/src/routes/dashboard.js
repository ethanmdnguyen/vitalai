// Dashboard route — GET /api/dashboard returns aggregated stats for the current user.
// Protected by JWT auth middleware. Mounted in index.js.

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { getDashboardData } = require("../controllers/dashboard.controller");

router.get("/", authMiddleware, getDashboardData);

module.exports = router;
