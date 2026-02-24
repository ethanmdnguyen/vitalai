// Review model — database queries for the weekly_reviews table.

const pool = require("../../db/pool");

async function saveReview(userId, weekStart, reviewText) {
  const result = await pool.query(
    `INSERT INTO weekly_reviews (user_id, week_start, review_text)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, weekStart, reviewText]
  );
  return result.rows[0];
}

async function getReviews(userId) {
  const result = await pool.query(
    `SELECT * FROM weekly_reviews WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

module.exports = { saveReview, getReviews };
