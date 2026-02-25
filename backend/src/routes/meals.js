// Meals routes — save, list, and delete saved meals.
// All routes are protected by JWT auth middleware.
// Mounted at /api/meals in index.js.

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { saveMyMeal, getMyMeals, deleteMyMeal } = require("../controllers/meal.controller");

router.post("/", authMiddleware, saveMyMeal);
router.get("/", authMiddleware, getMyMeals);
router.delete("/:id", authMiddleware, deleteMyMeal);

module.exports = router;
