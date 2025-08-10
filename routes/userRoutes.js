import express from "express";
import {
  registerUser,
  loginUser,
  verifyEmail,
  setPassword,
  getOrderHistory,
  placeOrder,
  forgotPassword,
  resetPassword,
  getOrderById,  
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public
router.post("/register", registerUser);
router.get("/verify-email", verifyEmail);
router.post("/set-password", setPassword);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected
router.use(protect);
router.post("/orders", placeOrder);
router.get("/orders", getOrderHistory);
router.get("/orders/:id", getOrderById);
router.get("/profile", (req, res) => res.json({ success: true, user: req.user }));

export default router;
