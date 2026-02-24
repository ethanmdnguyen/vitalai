// Reviews routes — protected endpoints for AI weekly review generation and retrieval.

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { generateReview, getReviews } = require("../controllers/review.controller");

router.post("/generate", authMiddleware, generateReview);
router.get("/", authMiddleware, getReviews);

module.exports = router;
