// Settings routes — DELETE /api/user/data and DELETE /api/user.
// Mounted at /api/user in index.js.

const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { deleteUserData, deleteUser } = require("../controllers/settings.controller");

router.use(auth);

router.delete("/data", deleteUserData);
router.delete("/", deleteUser);

module.exports = router;
