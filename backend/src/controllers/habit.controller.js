// Habit controller — saves habit logs with AI analysis and retrieves history.

const { analyzeHabits } = require("../services/ai.service");
const { saveHabitLog, getHabitLogs } = require("../models/habit.model");
const { getProfileByUserId } = require("../models/profile.model");

async function logHabits(req, res) {
  const userId = req.user.id;
  const { habits, logDate } = req.body;

  if (!habits || typeof habits !== "object") {
    return res.status(400).json({ error: "habits is required and must be an object." });
  }

  const date = logDate || new Date().toISOString().split("T")[0];

  try {
    const profile = await getProfileByUserId(userId);
    const analysis = await analyzeHabits(habits, profile, null);
    const saved = await saveHabitLog(userId, date, habits, analysis);
    return res.status(201).json({ ...saved, analysis });
  } catch (err) {
    console.error("[habit.controller] logHabits error:", err.message);
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || "Failed to log habits." });
  }
}

async function getHabitHistory(req, res) {
  try {
    const userId = req.user.id;
    const logs = await getHabitLogs(userId, 10);
    return res.status(200).json(logs);
  } catch (err) {
    console.error("[habit.controller] getHabitHistory error:", err.message);
    return res.status(500).json({ error: err.message || "Failed to fetch habit history." });
  }
}

module.exports = { logHabits, getHabitHistory };
