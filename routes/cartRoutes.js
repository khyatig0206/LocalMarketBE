const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/userAuth");
const { getCart, addToCart, removeFromCart } = require("../controllers/cartController");

router.get("/", authenticateUser, getCart);
router.post("/add", authenticateUser, addToCart);
router.post("/remove", authenticateUser, removeFromCart);

module.exports = router;
