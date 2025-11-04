const {Category} = require("../models/index")

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
}

exports.addCategory=async (req, res) => {
  try {
    const { name, platformFeePercent } = req.body;

    if (!name || !platformFeePercent || !req.file?.path) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await Category.findOne({ where: { name } });
    if (existing) {
      return res.status(409).json({ message: "Category already exists" });
    }

    const category = await Category.create({
      name,
      platformFeePercent,
      photo: req.file.path, // cloudinary URL
    });

    res.status(201).json({ message: "Category created", category });
  } catch (error) {
    console.error("Error adding category:", error);
    res.status(500).json({ message: "Failed to create category" });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, platformFeePercent } = req.body;
    const category = await Category.findByPk(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    category.name = name || category.name;
    category.platformFeePercent = platformFeePercent || category.platformFeePercent;
    if (req.file?.path) category.photo = req.file.path;

    await category.save();
    res.json({ message: "Category updated", category });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ message: "Failed to update category" });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Category.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category deleted" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ message: "Failed to delete category" });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    res.json(category);
  } catch (error) {
    console.error("Error fetching category by ID:", error);
    res.status(500).json({ message: "Failed to fetch category" });
  }
};

// GET /api/categories/paginated?page=1&limit=6
exports.getCategoriesPaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const offset = (page - 1) * limit;
    const { Category } = require("../models");
    const { count, rows } = await Category.findAndCountAll({
      offset,
      limit,
      order: [["id", "ASC"]],
    });
    res.json({
      categories: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch categories", error: err.message });
  }
};
