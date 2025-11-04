const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/userAuth");
const {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefault,
  getAddress
} = require("../controllers/addressController");
  

// Get all addresses of current user
router.get("/", authenticateUser, listAddresses);

// Create a new address
router.post("/", authenticateUser, createAddress);

// Update an address
router.put("/:id", authenticateUser, updateAddress);

// Delete an address
router.delete("/:id", authenticateUser, deleteAddress);

// Set default address
// Get single address by ID
router.get("/:id", authenticateUser, getAddress);
router.post("/:id/default", authenticateUser, setDefault);

module.exports = router;