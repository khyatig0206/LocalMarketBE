const express = require("express");
const router = express.Router();
const multer = require("multer");
const { storage } = require("../utils/cloudinary");
const upload = multer({ storage });
const {getCategories,addCategory,updateCategory,deleteCategory,getCategoryById,getCategoriesPaginated}= require("../controllers/categoryController")

router.get("/paginated", getCategoriesPaginated);
router.get("/",getCategories);
router.post("/add", upload.single("photo"), addCategory);
router.put("/:id", upload.single("photo"), updateCategory);
router.delete("/:id", deleteCategory);
router.get('/:id', getCategoryById);


module.exports = router;