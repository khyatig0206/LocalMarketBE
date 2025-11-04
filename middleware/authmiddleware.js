const jwt = require("jsonwebtoken");
const { Producer } = require("../models");
const Admin  = require("../models/Admin");

const JWT_SECRET = process.env.JWT_SECRET ;

exports.authenticateProducer = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization token missing" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const producer = await Producer.findByPk(decoded.id);
    if (!producer) {
      return res.status(404).json({ message: "Producer not found" });
    }

    req.producer = producer; // attach producer to request
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};


exports.authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization token missing" });
    }
    
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check role
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const admin = await Admin.findByPk(decoded.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    req.admin = admin; // Attach admin to request object
    next();
  } catch (error) {
    console.error("Admin Auth Middleware Error:", error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

