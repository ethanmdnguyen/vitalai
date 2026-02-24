// Log controller — handles saving and retrieving daily health logs.

const { saveLog, getLogByDate } = require("../models/log.model");

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

async function createOrUpdateLog(req, res) {
  const userId = req.user.id;
  const { energy_level, sleep_hours } = req.body;

  if (energy_level != null && (energy_level < 1 || energy_level > 5)) {
    return res.status(400).json({ error: "energy_level must be between 1 and 5." });
  }

  if (sleep_hours != null && (sleep_hours < 0 || sleep_hours > 24)) {
    return res.status(400).json({ error: "sleep_hours must be between 0 and 24." });
  }

  const logData = { ...req.body, log_date: getTodayDate() };
  const savedLog = await saveLog(userId, logData);

  return res.status(200).json(savedLog);
}

async function getTodayLog(req, res) {
  const userId = req.user.id;
  const log = await getLogByDate(userId, getTodayDate());
  return res.status(200).json(log || {});
}

module.exports = { createOrUpdateLog, getTodayLog };
