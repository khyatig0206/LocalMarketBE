const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const sequelize = require("./config/db");
  
app.use("/api/products", productRoutes);
app.use("/api/producer", producerRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
const cartRoutes = require("./routes/cartRoutes");
app.use("/api/cart", cartRoutes);
const orderRoutes = require("./routes/orderRoutes");
app.use("/api/orders", orderRoutes);

// Addresses (user saved addresses)
const addressRoutes = require("./routes/addressRoutes");
app.use("/api/addresses", addressRoutes);

// Reviews
const reviewRoutes = require("./routes/reviewRoutes");
app.use("/api/reviews", reviewRoutes);

// Disputes
const disputeRoutes = require("./routes/disputeRoutes");
app.use("/api/disputes", disputeRoutes);
const producerDisputeRoutes = require("./routes/producerDisputeRoutes");
app.use("/api/producer/disputes", producerDisputeRoutes);

// Search
const searchRoutes = require("./routes/search");
app.use("/api/search", searchRoutes);

// Initialize database connection and routes
(async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Import routes after database connection
    const productRoutes = require("./routes/productRoutes");
    const producerRoutes = require("./routes/producerRoutes");
    const categoryRoutes = require("./routes/categoryRoutes");
    const adminRoutes = require("./routes/adminRoutes");
    const userRoutes = require("./routes/userRoutes");
    const cartRoutes = require("./routes/cartRoutes");
    const orderRoutes = require("./routes/orderRoutes");
    const addressRoutes = require("./routes/addressRoutes");
    const reviewRoutes = require("./routes/reviewRoutes");
    const disputeRoutes = require("./routes/disputeRoutes");
    const producerDisputeRoutes = require("./routes/producerDisputeRoutes");
    const searchRoutes = require("./routes/search");

    // Use routes
    app.use("/api/products", productRoutes);
    app.use("/api/producer", producerRoutes);
    app.use("/api/categories", categoryRoutes);
    app.use("/api/admin", adminRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/cart", cartRoutes);
    app.use("/api/orders", orderRoutes);
    app.use("/api/addresses", addressRoutes);
    app.use("/api/reviews", reviewRoutes);
    app.use("/api/disputes", disputeRoutes);
    app.use("/api/producer/disputes", producerDisputeRoutes);
    app.use("/api/search", searchRoutes);

    console.log('✅ Routes loaded successfully');
  } catch (error) {
    console.error('❌ Initialization error:', error);
    process.exit(1);
  }
})();

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Export for Vercel serverless functions
module.exports = app;

// For local development
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
