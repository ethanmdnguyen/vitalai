// Plans routes — generate, retrieve, patch, and swap exercises for AI plans.
// All routes are protected by JWT auth middleware.
// Mounted at /api/plans in index.js.

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { generatePlan, getPlan, patchPlan, swapExerciseHandler, swapMealHandler, regenerateDayHandler } = require("../controllers/plan.controller");

router.post("/generate", authMiddleware, generatePlan);
router.get("/current", authMiddleware, getPlan);
router.patch("/current", authMiddleware, patchPlan);
router.post("/swap-exercise", authMiddleware, swapExerciseHandler);
router.post("/swap-meal", authMiddleware, swapMealHandler);
router.post("/regenerate-day", authMiddleware, regenerateDayHandler);

module.exports = router;
