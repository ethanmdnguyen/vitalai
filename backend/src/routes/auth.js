// Auth routes — POST /register, POST /login, POST /change-password.
// Mounted at /api/auth in index.js.

const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/auth.controller");
const { changePassword } = require("../controllers/settings.controller");
const auth = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.post("/change-password", auth, changePassword);

module.exports = router;
