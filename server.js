// server.js
import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";

import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";

// Validate environment variables before anything else
[
  "MONGO_URI",
  "JWT_SECRET",
  "EMAIL_GENERAL_USER",
  "EMAIL_GENERAL_PASS",
  "EMAIL_VERIFICATION_USER",
  "EMAIL_VERIFICATION_PASS",
  "FRONTEND_URL"
].forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing environment variable: ${key}`);
    process.exit(1);
  }
});

const app = express();

// Middleware
app.use(morgan("dev")); // Logs all requests
app.use(express.json());

// Secure & dynamic CORS
const allowedOrigins = [
  process.env.FRONTEND_URL, // Live frontend from .env
  "http://localhost:5173"   // Local dev
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Allow server-to-server or health checks
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS policy: Not allowed by CORS"), false);
  },
  credentials: true,
}));

// Routes
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);

// Health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

// 404 JSON response
app.use((req, res) => {
  res.status(404).json({ note: "No route matched", path: req.path, method: req.method });
});

// MongoDB connection & server start
mongoose.set("strictQuery", true);
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Global error handlers
process.on("uncaughtException", (err) => {
  console.error("🚨 Uncaught Exception!", err);
  process.exit(1);
});
process.on("unhandledRejection", (err) => {
  console.error("🚨 Unhandled Rejection!", err);
  process.exit(1);
});
