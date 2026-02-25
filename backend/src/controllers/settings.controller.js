// Settings controller — handles change-password, delete-user-data, delete-user.

const bcrypt = require("bcryptjs");
const pool = require("../../db/pool");

const SALT_ROUNDS = 10;

async function changePassword(req, res) {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "currentPassword and newPassword are required." });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters." });
  }

  const result = await pool.query("SELECT password_hash FROM users WHERE id = $1", [userId]);
  const user = result.rows[0];

  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const matches = await bcrypt.compare(currentPassword, user.password_hash);
  if (!matches) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, userId]);

  return res.status(200).json({ message: "Password updated successfully." });
}

async function deleteUserData(req, res) {
  const userId = req.user.id;

  await pool.query("DELETE FROM daily_logs WHERE user_id = $1", [userId]);
  await pool.query("DELETE FROM plans WHERE user_id = $1", [userId]);
  await pool.query("DELETE FROM weekly_reviews WHERE user_id = $1", [userId]);

  return res.status(200).json({ message: "All data has been reset." });
}

async function deleteUser(req, res) {
  const userId = req.user.id;

  // ON DELETE CASCADE on the FK constraints handles related rows automatically.
  await pool.query("DELETE FROM users WHERE id = $1", [userId]);

  return res.status(200).json({ message: "Account deleted successfully." });
}

module.exports = { changePassword, deleteUserData, deleteUser };
