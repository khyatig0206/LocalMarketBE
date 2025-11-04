require("dotenv").config();
const app = require("./app");

// ✅ Vercel expects a handler export, not a running server
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// ✅ Export the app (important for Vercel)
module.exports = app; 
