// Habit routes — POST to log habits + GET history. Both require auth.

const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth");
const { logHabits, getHabitHistory } = require("../controllers/habit.controller");

router.post("/", authenticate, logHabits);
router.get("/", authenticate, getHabitHistory);

module.exports = router;
