const adminController = require("../../controller/adminController");
const express = require("express");
const router = express.Router();


router.post("/register", adminController.registerAdmin);
router.post("/login", adminController.loginAdmin);

module.exports = router;