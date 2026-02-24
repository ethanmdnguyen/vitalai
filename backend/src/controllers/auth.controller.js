// Auth controller — handles register and login request logic.

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createUser, findUserByEmail } = require("../models/user.model");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 10;

// Fall back to a dev-only default so local dev and tests work without a set secret.
// Always set JWT_SECRET to a strong value in production.
const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_in_production";

function signToken(userId, username) {
  return jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: "7d" });
}

async function register(req, res) {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email, and password are all required." });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "Please provide a valid email address." });
  }

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = await createUser(username, email, passwordHash);
    const token = signToken(newUser.id, newUser.username);

    return res.status(201).json({
      token,
      user: { id: newUser.id, username: newUser.username, email: newUser.email },
    });
  } catch (err) {
    // PostgreSQL unique constraint violation
    if (err.code === "23505") {
      return res.status(409).json({ error: "An account with that email or username already exists." });
    }
    throw err;
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required." });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = signToken(user.id, user.username);

  return res.status(200).json({
    token,
    user: { id: user.id, username: user.username, email: user.email },
  });
}

module.exports = { register, login };
