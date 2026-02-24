// Profile routes — GET and POST /api/profile, both protected by JWT auth.
// Mounted at /api/profile in index.js.

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { updateProfile, getProfile } = require("../controllers/profile.controller");

router.get("/", authMiddleware, getProfile);
router.post("/", authMiddleware, updateProfile);

module.exports = router;
