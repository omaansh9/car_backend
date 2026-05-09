const express = require("express");
const cors = require("cors");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const connectDB = require("./config/database");
const users = require("./routes/api/users");
const admin = require("./routes/api/admin");
const cars = require("./routes/api/cars");
const bookings = require("./routes/api/bookings");
const errorHandler = require("./middleware/errorHandler");
const dotenv = require("dotenv");

dotenv.config();

// Connect to database
connectDB();

const app = express();

// Swagger setup
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use(cors({
  origin: 'https://omaansh.vercel.app',
  credentials: true,
}));

// API Routes
app.use("/api/users", users);
app.use("/api/admin", admin);
app.use("/api/cars", cars);
app.use("/api/bookings", bookings);

// Health check route
app.get("/", (req, res) => {
  res.json({
    message: "Car Rental API is running",
    version: "1.0.0",
    status: "healthy",
    developer: "Omaansh",
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
});
