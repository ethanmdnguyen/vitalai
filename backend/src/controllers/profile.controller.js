// Profile controller — handles get and upsert of a user's health profile.
// v1 required fields are still enforced for backwards compatibility.
// v2 fields (fitness_level, workout_types, dietary_restrictions, etc.) are optional.

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

  // createOrUpdateProfile handles all v1 + v2 fields; arrays are stringified by the model.
  const profile = await createOrUpdateProfile(userId, req.body);
  return res.status(200).json(profile);
}

async function getProfile(req, res) {
  const userId = req.user.id;
  const profile = await getProfileByUserId(userId);

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  // workout_types, dietary_restrictions, secondary_goals are already parsed to arrays by the model.
  return res.status(200).json(profile);
}

module.exports = { updateProfile, getProfile };
