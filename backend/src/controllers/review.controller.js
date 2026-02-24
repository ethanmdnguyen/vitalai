// Review controller — generates AI weekly reviews and retrieves past ones.

const { generateWeeklyReview } = require("../services/ai.service");
const { saveReview, getReviews: getReviewsFromDB } = require("../models/review.model");
const { getProfileByUserId } = require("../models/profile.model");
const { getCurrentPlan } = require("../models/plan.model");
const { getLogsForWeek } = require("../models/log.model");

// Returns the ISO date string (YYYY-MM-DD) for Monday of the current week.
// Uses local date components (not toISOString) to avoid UTC vs local day mismatch.
function getMondayOfCurrentWeek() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMonday);
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, "0");
  const day = String(monday.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function generateReview(req, res) {
  const userId = req.user.id;

  const profile = await getProfileByUserId(userId);
  if (!profile) {
    return res.status(400).json({ error: "Complete your profile before requesting a review" });
  }

  const plan = await getCurrentPlan(userId);
  if (!plan) {
    return res.status(400).json({ error: "Generate a plan before requesting a review" });
  }

  const weekStart = getMondayOfCurrentWeek();
  const logs = await getLogsForWeek(userId, weekStart);

  if (logs.length < 3) {
    return res.status(400).json({ error: "Log at least 3 days before requesting a review" });
  }

  const reviewText = await generateWeeklyReview(profile, plan, logs);
  const saved = await saveReview(userId, weekStart, reviewText);

  return res.status(200).json({ review: reviewText, weekStart: saved.week_start });
}

async function getReviews(req, res) {
  const userId = req.user.id;
  const reviews = await getReviewsFromDB(userId);
  return res.status(200).json(reviews);
}

module.exports = { generateReview, getReviews };
