const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const buildAdminResponse = admin => ({
  id: admin._id,
  email: admin.email,
  name: admin.name,
  role: admin.role,
});

const createAdminToken = admin =>
  jwt.sign(
    { userId: admin._id, email: admin.email, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

const registerAdmin = async (req, res) => {
  try {
    const { email, name, password } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail || !name || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "A user with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await User.create({
      email: normalizedEmail,
      name,
      password: hashedPassword,
      role: "admin",
    });

    res.status(201).json({
      message: "Admin registered successfully",
      token: createAdminToken(admin),
      admin: buildAdminResponse(admin),
    });
  } catch (error) {
    res.status(500).json({ message: "Error registering admin", error: error.message });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const admin = await User.findOne({ email: normalizedEmail });
    if (!admin) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (admin.role !== "admin") {
      return res.status(403).json({ message: "This account does not have admin access" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    res.json({
      message: "Admin login successful",
      token: createAdminToken(admin),
      admin: buildAdminResponse(admin),
    });
  } catch (error) {
    res.status(500).json({ message: "Error logging in admin", error: error.message });
  }
};

module.exports = {
  registerAdmin,
  loginAdmin,
};
