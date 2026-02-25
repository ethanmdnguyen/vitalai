// Plan controller — generates an AI plan for the user and retrieves the current one.

const { generateWeeklyPlan, suggestExerciseAlternatives, suggestMealAlternatives } = require("../services/ai.service");
const { savePlan, getCurrentPlan, updatePlanWorkout, updatePlanMeal } = require("../models/plan.model");
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

async function patchPlan(req, res) {
  const { workoutPlan, mealPlan } = req.body;
  if (!workoutPlan && !mealPlan) {
    return res.status(400).json({ error: "workoutPlan or mealPlan is required." });
  }

  const updated = workoutPlan
    ? await updatePlanWorkout(req.user.id, workoutPlan)
    : await updatePlanMeal(req.user.id, mealPlan);

  if (!updated) {
    return res.status(404).json({ error: "No plan found to update." });
  }

  return res.status(200).json(updated);
}

async function swapMealHandler(req, res) {
  const { mealType, dietType, calorieTarget, restrictions, customRequest } = req.body;

  const profile = await getProfileByUserId(req.user.id);
  const effectiveDietType = dietType || profile?.diet_type || "standard";

  const alternatives = await suggestMealAlternatives({
    mealType,
    dietType: effectiveDietType,
    calorieTarget,
    restrictions,
    customRequest,
  });

  return res.status(200).json({ alternatives });
}

async function swapExerciseHandler(req, res) {
  const { exerciseName, primaryMuscle, userWeightKg, customRequest } = req.body;

  // Fall back to the user's profile weight if not supplied by the client.
  const profile = await getProfileByUserId(req.user.id);
  const weightKg = userWeightKg || profile?.weight_kg || 70;

  const alternatives = await suggestExerciseAlternatives({
    exerciseName,
    primaryMuscle,
    userWeightKg: weightKg,
    customRequest,
  });

  return res.status(200).json({ alternatives });
}

module.exports = { generatePlan, getPlan, patchPlan, swapExerciseHandler, swapMealHandler };
