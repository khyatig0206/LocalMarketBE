const express = require('express');
const cors = require('cors');
const sequelize = require("./config/db");
const productRoutes = require("./routes/productRoutes");
const producerRoutes =require("./routes/producerRoutes");
const categoryRoutes = require("./routes/categoryRoutes")
const adminRoutes = require("./routes/adminRoutes")
const app = express();
const allowedOrigins = [
  "https://local-market-store-fe.vercel.app", // your frontend domain
  "http://localhost:5173", // for local dev (optional)
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like curl or Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS not allowed for this origin"));
      }
    },
    credentials: true,
  })
);

// Optional: handle preflight requests globally
app.options("/*", cors());

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
