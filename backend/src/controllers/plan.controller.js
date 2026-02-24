// Plan controller — generates an AI plan for the user and retrieves the current one.

const { generateWeeklyPlan } = require("../services/ai.service");
const { savePlan, getCurrentPlan } = require("../models/plan.model");
const { getProfileByUserId } = require("../models/profile.model");

// Returns the ISO date string (YYYY-MM-DD) for Monday of the current week.
function getMondayOfCurrentWeek() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMonday);
  return monday.toISOString().split("T")[0];
}

async function generatePlan(req, res) {
  const userId = req.user.id;

  const profile = await getProfileByUserId(userId);
  if (!profile) {
    return res.status(400).json({ error: "Complete your profile first" });
  }

  const aiPlan = await generateWeeklyPlan(profile);
  const weekStart = getMondayOfCurrentWeek();

  const savedPlan = await savePlan(
    userId,
    weekStart,
    aiPlan.workoutPlan,
    aiPlan.mealPlan,
    aiPlan.notes
  );

  return res.status(200).json(savedPlan);
}

async function getPlan(req, res) {
  const userId = req.user.id;
  const plan = await getCurrentPlan(userId);
  return res.status(200).json(plan);
}

module.exports = { generatePlan, getPlan };
