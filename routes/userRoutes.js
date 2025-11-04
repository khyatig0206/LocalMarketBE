const express = require("express");
const router = express.Router();
const { signup, signin, getMe, updateMe, changePassword, getUserLocation } = require("../controllers/userController");
const { authenticateUser } = require("../middleware/userAuth");
const { registerUserToken, unregisterUserToken } = require("../controllers/userPushController");

router.post("/signup", signup);
router.post("/signin", signin);

// Authenticated user profile
router.get("/me", authenticateUser, getMe);
router.put("/me", authenticateUser, updateMe);
router.post("/change-password", authenticateUser, changePassword);

// User location from default address (optional auth - works for both logged in and out)
router.get("/location", authenticateUser, getUserLocation);

// Push token endpoints for users
router.post("/push-token", authenticateUser, registerUserToken);
router.delete("/push-token", authenticateUser, unregisterUserToken);

module.exports = router;
