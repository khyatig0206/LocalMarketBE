const { Sequelize } = require("sequelize");
const pg = require("pg"); // ✅ explicitly load pg driver
require("dotenv").config();

// Ensure all env vars are present
const requiredEnvVars = ['DB_NAME', 'DB_USER', 'DB_PASS', 'DB_HOST'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(
    `❌ Missing required environment variables: ${missingVars.join(', ')}. 
    Please set them in your Vercel project settings.`
  );
}

// ✅ Initialize Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: "postgres",
    dialectModule: pg, // ✅ force Sequelize to use the pg driver
    port: process.env.DB_PORT || 5432,
    logging: false,

    // ✅ Most cloud Postgres instances (Neon, Render, Railway, Supabase, etc.) require SSL
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // allows self-signed or managed certs
      },
    },
  }
);

sequelize
  .authenticate()
  .then(() => console.log("✅ Database connected successfully"))
  .catch((err) => console.error("❌ Database connection failed:", err));

module.exports = sequelize;
