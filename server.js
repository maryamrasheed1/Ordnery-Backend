// server.js
import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());


app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);

// Health
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Helpful 404 (keeps JSON so you see which path missed)
app.use((req, res) => {
  res.status(404).json({ note: "No route matched", path: req.path, method: req.method });
});

// DB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// Global handlers
process.on("uncaughtException", (err) => {
  console.error("🚨 Uncaught Exception! 🚨", err);
  server.close(() => process.exit(1));
});
process.on("unhandledRejection", (err) => {
  console.error("🚨 Unhandled Rejection! 🚨", err);
  server.close(() => process.exit(1));
});
