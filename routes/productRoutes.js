const express = require("express");
const router = express.Router();
const { createProduct, getAllProducts, searchProducts, getProductById, updateProduct, deleteProduct, getBestSellers, getProductsCount } = require("../controllers/productController");
const multer = require("multer");
const { storage } = require("../utils/cloudinary");
const { authenticateProducer } = require("../middleware/authmiddleware");

const upload = multer({ storage });

router.post("/", authenticateProducer, upload.array("images", 5), createProduct);
router.get("/", getAllProducts);
router.get("/count", getProductsCount);
router.get("/best-sellers", getBestSellers);
router.get("/search", searchProducts);
router.get("/:id", getProductById);
router.put("/:id", authenticateProducer, upload.array("images", 5), updateProduct);
router.delete("/:id", authenticateProducer, deleteProduct);

module.exports = router;
