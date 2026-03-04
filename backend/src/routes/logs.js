// Logs routes — POST to save today's log, GET to retrieve it.
// Both routes are protected by JWT auth middleware.
// Mounted at /api/logs in index.js.

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { createOrUpdateLog, getTodayLog, patchTodayLogHandler } = require("../controllers/log.controller");

router.post("/", authMiddleware, createOrUpdateLog);
router.get("/today", authMiddleware, getTodayLog);
router.patch("/today", authMiddleware, patchTodayLogHandler);

module.exports = router;
