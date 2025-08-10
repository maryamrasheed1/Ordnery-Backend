// routes/orderRoutes.js
import express from "express";
import { protect, admin } from "../middleware/authMiddleware.js"; // Corrected import name from adminOnly to admin
import {
  placeOrder,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
  trackOrder, 
} from "../controllers/orderControllers.js"; // Corrected import path

const router = express.Router();

router.route("/place").post(protect, placeOrder);
router.route("/my-orders").get(protect, getUserOrders);

// Corrected: This route now correctly expects the trackingId parameter.
router.route("/track/:trackingId").get(trackOrder);

// Admin-only routes
router.route("/admin/all-orders").get(protect, admin, getAllOrders);
router.route("/admin/:id").put(protect, admin, updateOrderStatus);
router.route("/admin/:id").delete(protect, admin, deleteOrder);

export default router;
