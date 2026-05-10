const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();


// ======================================
// DATABASE
// ======================================
const connectDB = require("./config/database");


// ======================================
// ROUTES
// ======================================
const users = require("./routes/api/users");
const admin = require("./routes/api/admin");
const cars = require("./routes/api/cars");
const bookings = require("./routes/api/bookings");
const payments = require("./routes/api/payments");


// ======================================
// MIDDLEWARE
// ======================================
const errorHandler = require("./middleware/errorHandler");


// ======================================
// CONNECT DATABASE
// ======================================
connectDB();


// ======================================
// INITIALIZE EXPRESS
// ======================================
const app = express();

const normalizeOrigin = origin => origin?.replace(/\/$/, "");

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.CLIENT_URL_2,
  process.env.FRONTEND_URL,
  "http://localhost:5173",
]
  .filter(Boolean)
  .map(normalizeOrigin);


// ======================================
// STRIPE WEBHOOK RAW BODY
// MUST COME BEFORE express.json()
// ======================================
app.use(
  "/api/payments/webhook",
  express.raw({ type: "application/json" })
);


// ======================================
// NORMAL BODY PARSERS
// ======================================
app.use(express.json({
  limit: "10mb"
}));

app.use(express.urlencoded({
  extended: true
}));


// ======================================
// CORS
// ======================================
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  })
);


// ======================================
// HEALTH CHECK
// ======================================
app.get("/", (req, res) => {

  res.status(200).json({

    success: true,

    message: "Car Rental API Running",

    version: "1.0.0",

    developer: "Omaansh",
  });
});


// ======================================
// API ROUTES
// ======================================
app.use("/api/users", users);

app.use("/api/admin", admin);

app.use("/api/cars", cars);

app.use("/api/bookings", bookings);

app.use("/api/payments", payments);


// ======================================
// 404 ROUTE
// ======================================
app.use("*", (req, res) => {

  res.status(404).json({

    success: false,

    message: "Route not found",
  });
});


// ======================================
// GLOBAL ERROR HANDLER
// ======================================
app.use(errorHandler);


// ======================================
// SERVER
// ======================================
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {

  console.log("====================================");

  console.log(`Server running on port ${PORT}`);

  console.log(`URL: http://localhost:${PORT}`);

  console.log("====================================");
});
