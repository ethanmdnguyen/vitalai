// Plans routes — generate and retrieve AI-powered weekly plans.
// Both routes are protected by JWT auth middleware.
// Mounted at /api/plans in index.js.

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { generatePlan, getPlan } = require("../controllers/plan.controller");

router.post("/generate", authMiddleware, generatePlan);
router.get("/current", authMiddleware, getPlan);

module.exports = router;
