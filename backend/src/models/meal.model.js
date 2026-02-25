// Meal model — database queries for the saved_meals table.
// ingredients and macros are stored as JSON strings and parsed on read.

const pool = require("../../db/pool");

async function saveMeal(userId, mealData) {
  const {
    name, meal_type, ingredients, instructions,
    macros, prep_time_minutes, cook_time_minutes,
    servings, external_recipe_url,
  } = mealData;

  const result = await pool.query(
    `INSERT INTO saved_meals
       (user_id, name, meal_type, ingredients, instructions, macros,
        prep_time_minutes, cook_time_minutes, servings, external_recipe_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      userId,
      name,
      meal_type || null,
      JSON.stringify(ingredients),
      instructions || null,
      macros ? JSON.stringify(macros) : null,
      prep_time_minutes || null,
      cook_time_minutes || null,
      servings || 1,
      external_recipe_url || null,
    ]
  );

  return parseRow(result.rows[0]);
}

async function getMealsByUserId(userId) {
  const result = await pool.query(
    "SELECT * FROM saved_meals WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return result.rows.map(parseRow);
}

async function deleteMealById(mealId, userId) {
  const result = await pool.query(
    "DELETE FROM saved_meals WHERE id = $1 AND user_id = $2 RETURNING id",
    [mealId, userId]
  );
  return result.rows[0] || null;
}

function parseRow(row) {
  if (!row) return null;
  return {
    ...row,
    ingredients: typeof row.ingredients === "string" ? JSON.parse(row.ingredients) : row.ingredients,
    macros: row.macros
      ? (typeof row.macros === "string" ? JSON.parse(row.macros) : row.macros)
      : null,
  };
}

module.exports = { saveMeal, getMealsByUserId, deleteMealById };
