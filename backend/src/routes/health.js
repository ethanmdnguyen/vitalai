// Health check route. GET /api/health returns server status and current timestamp.

const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

module.exports = router;
