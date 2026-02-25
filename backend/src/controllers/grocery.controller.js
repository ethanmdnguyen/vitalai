// Grocery controller — generate, retrieve, toggle, uncheck-all, and clear grocery lists.

const { categorizeGroceries } = require("../services/ai.service");
const {
  getCurrentPlanForUser,
  saveGroceryItems,
  getGroceryItemsByPlan,
  toggleGroceryItem,
  uncheckAllItems,
  clearGroceryItems,
} = require("../models/grocery.model");

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const CATEGORY_ORDER = ["Produce", "Proteins", "Dairy & Eggs", "Grains & Carbs", "Pantry", "Other"];

function groupByCategory(items) {
  const grouped = {};
  for (const item of items) {
    const cat = item.category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }
  // Return in standard order, then any extras.
  const ordered = {};
  for (const cat of CATEGORY_ORDER) {
    if (grouped[cat]) ordered[cat] = grouped[cat];
  }
  for (const [cat, catItems] of Object.entries(grouped)) {
    if (!ordered[cat]) ordered[cat] = catItems;
  }
  return ordered;
}

async function generateGroceryList(req, res) {
  const userId = req.user.id;

  const plan = await getCurrentPlanForUser(userId);
  if (!plan) {
    return res.status(400).json({ error: "No meal plan found. Generate a plan first." });
  }

  const mealPlan =
    typeof plan.meal_plan === "string" ? JSON.parse(plan.meal_plan) : plan.meal_plan;

  // Extract all ingredients across all meal types.
  const allIngredients = [];
  for (const mealType of MEAL_TYPES) {
    const meal = mealPlan[mealType];
    if (meal?.ingredients) {
      for (const ingredient of meal.ingredients) {
        allIngredients.push({ ingredient, meal_name: meal.name, meal_type: mealType });
      }
    }
  }

  if (!allIngredients.length) {
    return res.status(400).json({ error: "No ingredients found in your meal plan." });
  }

  const categorized = await categorizeGroceries(allIngredients);
  const saved = await saveGroceryItems(userId, plan.id, categorized);

  return res.status(200).json(groupByCategory(saved));
}

async function getGroceryList(req, res) {
  const userId = req.user.id;

  const plan = await getCurrentPlanForUser(userId);
  if (!plan) return res.status(200).json({});

  const items = await getGroceryItemsByPlan(userId, plan.id);
  return res.status(200).json(groupByCategory(items));
}

async function toggleItem(req, res) {
  const { id } = req.params;
  const item = await toggleGroceryItem(id, req.user.id);
  if (!item) return res.status(404).json({ error: "Item not found." });
  return res.status(200).json(item);
}

async function uncheckAll(req, res) {
  const userId = req.user.id;
  const plan = await getCurrentPlanForUser(userId);
  if (plan) await uncheckAllItems(userId, plan.id);
  const items = plan ? await getGroceryItemsByPlan(userId, plan.id) : [];
  return res.status(200).json(groupByCategory(items));
}

async function clearList(req, res) {
  const userId = req.user.id;
  const plan = await getCurrentPlanForUser(userId);
  if (plan) await clearGroceryItems(userId, plan.id);
  return res.status(200).json({ message: "Grocery list cleared." });
}

module.exports = { generateGroceryList, getGroceryList, toggleItem, uncheckAll, clearList };
