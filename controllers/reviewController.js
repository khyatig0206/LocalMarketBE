const { Review, User, Product, Producer } = require("../models/index");

// Add a review for a product
exports.addReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!productId || !rating) {
      return res.status(400).json({ message: "Product ID and rating are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if user has already reviewed this product
    const existingReview = await Review.findOne({
      where: { userId, productId }
    });
    if (existingReview) {
      return res.status(400).json({ message: "You have already reviewed this product" });
    }

    const images = (req.files || []).map((file) => file.path).slice(0, 5);

    const review = await Review.create({
      userId,
      productId,
      rating,
      comment: comment || null,
      images,
    });

    // Update product's aggregate rating fields
    const prevTotal = product.totalReviews || 0;
    const newTotal = prevTotal + 1;
    const prevAvg = product.averageRating || 0;
    const newAvg = ((prevAvg * prevTotal) + Number(rating)) / newTotal;
    await product.update({
    totalReviews: newTotal,
    averageRating: Math.round(newAvg * 10) / 10,
    });

    // Update producer aggregates incrementally
    try {
    const producer = await Producer.findByPk(product.producerId);
      if (producer) {
           const pPrevTotal = producer.totalReviews || 0;
        const pNewTotal = pPrevTotal + 1;
        const pPrevAvg = producer.averageRating || 0;
        const pNewAvg = ((pPrevAvg * pPrevTotal) + Number(rating)) / pNewTotal;
        await producer.update({
          totalReviews: pNewTotal,
          averageRating: Math.round(pNewAvg * 10) / 10,
        });
      }
    } catch (e) {
      console.warn('Failed to update producer aggregates after review:', e?.message || e);
    }
 
    // Return review with user info
    const reviewWithUser = await Review.findByPk(review.id, {
      include: [{ model: User, attributes: ["username"] }],
    });
 
    res.status(201).json(reviewWithUser);
  } catch (error) {
    console.error("Add Review Error:", error);
    res.status(500).json({ message: "Failed to add review" });
  }
};

// Get reviews for a product
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit, offset } = req.query;

    const queryOptions = {
      where: { productId },
      include: [{ model: User, attributes: ["username"] }],
      order: [["createdAt", "DESC"]],
    };

    if (limit) queryOptions.limit = parseInt(limit);
    if (offset) queryOptions.offset = parseInt(offset);

    const reviews = await Review.findAll(queryOptions);
    res.json(reviews);
  } catch (error) {
    console.error("Get Reviews Error:", error);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
};
