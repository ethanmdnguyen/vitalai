// Saved workouts controller — retrieves user-saved workout templates.

const { getSavedWorkouts } = require("../models/savedWorkouts.model");

async function getSavedWorkoutsHandler(req, res) {
  const workouts = await getSavedWorkouts(req.user.id);
  return res.status(200).json(workouts);
}

module.exports = { getSavedWorkoutsHandler };
