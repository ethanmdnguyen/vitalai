// Meal controller — save, list, and delete meals from the saved_meals library.

const { saveMeal, getMealsByUserId, deleteMealById } = require("../models/meal.model");

async function saveMyMeal(req, res) {
  const { name, ingredients } = req.body;
  if (!name) {
    return res.status(400).json({ error: "name is required." });
  }
  if (!ingredients) {
    return res.status(400).json({ error: "ingredients is required." });
  }

  const meal = await saveMeal(req.user.id, req.body);
  return res.status(201).json(meal);
}

async function getMyMeals(req, res) {
  const meals = await getMealsByUserId(req.user.id);
  return res.status(200).json(meals);
}

async function deleteMyMeal(req, res) {
  const { id } = req.params;
  const deleted = await deleteMealById(id, req.user.id);
  if (!deleted) {
    return res.status(404).json({ error: "Meal not found." });
  }
  return res.status(200).json({ message: "Meal deleted." });
}

module.exports = { saveMyMeal, getMyMeals, deleteMyMeal };
