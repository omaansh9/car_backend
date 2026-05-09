const adminModel = require("../models/Admin");
const sendMail = require("../utils/sendMail");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const registerAdmin = async (req, res) => {
    try {
        const { email, name, password } = req.body;
        if (!email || !name || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existingAdmin = await adminModel.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ message: "Admin with this email already exists" });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = new adminModel({ email, name, password: hashedPassword });
        await newAdmin.save();
        // await sendMail(
        //         email,
        //         'Admin Registration Successful',
        //         `
        //         <h2>Welcome Admin</h2>
        //         <p>Hello ${name},</p>
        //         <p>Your admin account has been created successfully.</p>
        //         `
        // );
        res.status(201).json({ message: "Admin registered successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error registering admin", error });
    }
};

const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        const admin = await adminModel.findOne({ email });
        if (!admin) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.json({ token, admin: { id: admin._id, email: admin.email, name: admin.name } });
    } catch (error) {
        res.status(500).json({ message: "Error logging in admin", error });
    }
};


module.exports = {
    registerAdmin,
    loginAdmin
};