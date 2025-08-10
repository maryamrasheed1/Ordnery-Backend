// server.js
import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";

import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ====== 1️⃣ Check Required Environment Variables ======
[
  "MONGO_URI",
  "JWT_SECRET",
  "EMAIL_VERIFICATION_USER",
  "EMAIL_VERIFICATION_PASS"
].forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing environment variable: ${key}`);
    process.exit(1);
  }
});

// ====== 2️⃣ Secure CORS ======
const allowedOrigins = [
  "https://theordnery.com", // live frontend
  "http://localhost:5173",  // local dev
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow health checks / server-to-server
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS policy: Not allowed by CORS"), false);
  },
  credentials: true,
}));

// ====== 3️⃣ Middleware ======
app.use(express.json());
app.use(morgan("dev")); // request logging

// ====== 4️⃣ Routes ======
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);

// Health check (used by Render)
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Helpful 404 JSON response
app.use((req, res) => {
  res.status(404).json({ note: "No route matched", path: req.path, method: req.method });
});

// ====== 5️⃣ MongoDB Connection & Server Start ======
mongoose.set("strictQuery", true);
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// ====== 6️⃣ Global Error Handlers ======
process.on("uncaughtException", (err) => {
  console.error("🚨 Uncaught Exception! 🚨", err);
  process.exit(1);
});
process.on("unhandledRejection", (err) => {
  console.error("🚨 Unhandled Rejection! 🚨", err);
  process.exit(1);
});
