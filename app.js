const express = require('express');
const cors = require('cors');
const sequelize = require("./config/db");
const productRoutes = require("./routes/productRoutes");
const producerRoutes =require("./routes/producerRoutes");
const categoryRoutes = require("./routes/categoryRoutes")
const adminRoutes = require("./routes/adminRoutes")
const app = express();
app.use(
  cors({
    origin: "*", // ✅ Allow requests from any origin
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], // optional: specify methods
  })
);
app.use(express.json());
const userRoutes = require("./routes/userRoutes");

sequelize.sync({ alter: true })
  .then(() => console.log("✅ Database synced"))
  .catch((err) => console.error("❌ DB Sync Error:", err));
  
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

module.exports = app;
