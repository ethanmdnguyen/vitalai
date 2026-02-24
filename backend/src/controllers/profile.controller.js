// Profile controller — handles get and upsert of a user's health profile.

const { createOrUpdateProfile, getProfileByUserId } = require("../models/profile.model");

const REQUIRED_FIELDS = ["age", "weight_kg", "height_cm", "goal", "diet_type", "workout_days_per_week"];

async function updateProfile(req, res) {
  const userId = req.user.id;

  const missingFields = REQUIRED_FIELDS.filter(
    (field) => req.body[field] == null || req.body[field] === ""
  );
  if (missingFields.length > 0) {
    return res.status(400).json({
      error: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const profile = await createOrUpdateProfile(userId, req.body);
  return res.status(200).json(profile);
}

async function getProfile(req, res) {
  const userId = req.user.id;
  const profile = await getProfileByUserId(userId);

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  return res.status(200).json(profile);
}

module.exports = { updateProfile, getProfile };
