const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, Cart, Order, Address } = require("../models/index");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ message: "Email already in use" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashedPassword });
    // Create a cart for the user
    await Cart.create({ userId: user.id });
    res.status(201).json({ message: "User registered successfully", user: { id: user.id, username, email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Signup failed" });
  }
};

exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Signin failed" });
  }
};

// Get current user profile
exports.getMe = async (req, res) => {
  try {
    const u = req.user; // set by authenticateUser
    if (!u) return res.status(401).json({ message: "Unauthorized" });
    res.json({ id: u.id, username: u.username, email: u.email });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load user" });
  }
};

// Update current user (allow username only for now)
exports.updateMe = async (req, res) => {
  try {
    const u = req.user;
    if (!u) return res.status(401).json({ message: "Unauthorized" });
    const { username } = req.body;
    if (typeof username === 'string' && username.trim()) {
      u.username = username.trim();
    }
    await u.save();
    res.json({ id: u.id, username: u.username, email: u.email });
  } catch (error) {
    console.error(error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Username already taken' });
    }
    res.status(500).json({ message: "Failed to update user" });
  }
};

// Change password: verify old password, set new hashed password
exports.changePassword = async (req, res) => {
  try {
    const u = req.user;
    if (!u) return res.status(401).json({ message: "Unauthorized" });
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Both oldPassword and newPassword are required" });
    }
    const isMatch = await bcrypt.compare(oldPassword, u.password);
    if (!isMatch) return res.status(401).json({ message: "Current password is incorrect" });
    if (String(newPassword).length < 8) return res.status(400).json({ message: "New password must be at least 8 characters" });
    u.password = await bcrypt.hash(newPassword, 10);
    await u.save();
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to change password" });
  }
};

// Get user's default location (from default address if exists)
exports.getUserLocation = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.json({ location: null });
    }

    const defaultAddress = await Address.findOne({
      where: { userId, isDefault: true },
    });

    if (defaultAddress && defaultAddress.latitude && defaultAddress.longitude) {
      return res.json({
        location: {
          latitude: defaultAddress.latitude,
          longitude: defaultAddress.longitude,
        },
      });
    }

    res.json({ location: null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get user location" });
  }
};
