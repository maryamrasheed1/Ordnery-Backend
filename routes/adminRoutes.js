import express from 'express';
import { loginAdmin, registerAdmin, getDashboardSummary, getProducts, getOrders, getUsers } from '../controllers/adminController.js'; // Correct import for controller functions
import { protect, admin } from '../middleware/authMiddleware.js'; // Correct import for middleware

const router = express.Router();

router.post('/register', registerAdmin);
router.post('/login', loginAdmin);

// Protected routes for a logged-in admin
router.get('/dashboard', protect, admin, getDashboardSummary);
router.get('/products', protect, admin, getProducts);
router.get('/orders', protect, admin, getOrders);
router.get('/users', protect, admin, getUsers);  // Adding route for getting users

export default router;
