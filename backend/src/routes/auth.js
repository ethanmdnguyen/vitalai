// Auth routes — POST /register and POST /login.
// Mounted at /api/auth in index.js.

const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/auth.controller");

router.post("/register", register);
router.post("/login", login);

module.exports = router;
