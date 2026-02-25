// Grocery model — database queries for the grocery_items table.

const pool = require("../../db/pool");

// Returns the most recent plan row for a user (id + meal_plan).
async function getCurrentPlanForUser(userId) {
  const result = await pool.query(
    "SELECT id, meal_plan FROM plans WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
    [userId]
  );
  return result.rows[0] || null;
}

// Deletes existing items for this plan then bulk-inserts the new set.
async function saveGroceryItems(userId, planId, items) {
  await pool.query(
    "DELETE FROM grocery_items WHERE user_id = $1 AND plan_id = $2",
    [userId, planId]
  );

  if (!items.length) return [];

  const values = items
    .map((_, i) => {
      const b = i * 6;
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6})`;
    })
    .join(", ");

  const params = items.flatMap((item) => [
    userId,
    planId,
    item.ingredient,
    item.meal_name || null,
    item.meal_type || null,
    item.category || "Other",
  ]);

  const result = await pool.query(
    `INSERT INTO grocery_items (user_id, plan_id, ingredient, meal_name, meal_type, category)
     VALUES ${values}
     RETURNING *`,
    params
  );

  return result.rows;
}

async function getGroceryItemsByPlan(userId, planId) {
  const result = await pool.query(
    "SELECT * FROM grocery_items WHERE user_id = $1 AND plan_id = $2 ORDER BY category, created_at",
    [userId, planId]
  );
  return result.rows;
}

// Flips the checked boolean for a single item.
async function toggleGroceryItem(id, userId) {
  const result = await pool.query(
    "UPDATE grocery_items SET checked = NOT checked WHERE id = $1 AND user_id = $2 RETURNING *",
    [id, userId]
  );
  return result.rows[0] || null;
}

// Sets checked = false for all items in this plan.
async function uncheckAllItems(userId, planId) {
  await pool.query(
    "UPDATE grocery_items SET checked = false WHERE user_id = $1 AND plan_id = $2",
    [userId, planId]
  );
}

// Deletes all grocery items for this plan.
async function clearGroceryItems(userId, planId) {
  await pool.query(
    "DELETE FROM grocery_items WHERE user_id = $1 AND plan_id = $2",
    [userId, planId]
  );
}

module.exports = {
  getCurrentPlanForUser,
  saveGroceryItems,
  getGroceryItemsByPlan,
  toggleGroceryItem,
  uncheckAllItems,
  clearGroceryItems,
};
