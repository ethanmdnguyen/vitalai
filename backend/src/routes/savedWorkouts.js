// Saved workouts routes — fetch user-saved workout templates.
// Mounted at /api/saved-workouts in index.js.

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { getSavedWorkoutsHandler } = require("../controllers/savedWorkouts.controller");

router.get("/", authMiddleware, getSavedWorkoutsHandler);

module.exports = router;
