// Grocery routes — generate, retrieve, toggle, uncheck-all, and clear grocery lists.
// All routes are protected by JWT auth middleware.
// Mounted at /api/grocery in index.js.

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { generateGroceryList, getGroceryList, toggleItem, uncheckAll, clearList } = require("../controllers/grocery.controller");

router.post("/generate", authMiddleware, generateGroceryList);
router.get("/", authMiddleware, getGroceryList);
router.patch("/", authMiddleware, uncheckAll);
router.patch("/:id", authMiddleware, toggleItem);
router.delete("/", authMiddleware, clearList);

module.exports = router;
