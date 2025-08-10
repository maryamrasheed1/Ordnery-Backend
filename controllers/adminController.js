import Admin from '../models/Admin.js'; // Correct path to Admin model
import Product from '../models/product.js'; // Correct path to Product model (make sure it's correctly named)
import Order from '../models/Order.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Function to generate a JWT token
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });

// Register new admin
export const registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, msg: 'All fields are required' });
    }
    const exist = await Admin.findOne({ email });
    if (exist) {
      return res.status(400).json({ success: false, msg: 'Admin already exists' });
    }
    const admin = await Admin.create({ name, email, password });
    return res.status(201).json({
      success: true,
      token: generateToken(admin._id),
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
};

// Login admin
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, msg: 'Email and password are required' });
    }
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ success: false, msg: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, msg: 'Invalid credentials' });
    }
    return res.status(200).json({
      success: true,
      token: generateToken(admin._id),
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
};

// Get dashboard summary data
export const getDashboardSummary = async (req, res) => {
  try {
    const totalRevenueResult = await Order.aggregate([
      { $match: { status: 'Delivered' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    const newOrdersCount = await Order.countDocuments({ status: 'Pending' });

    const totalCustomersCount = await User.countDocuments();

    const recentOrders = await Order.find()
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      totalRevenue,
      newOrdersCount,
      totalCustomersCount,
      recentOrders,
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// Get all products
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    res.status(200).json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// Get all orders
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.status(200).json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// Get all users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.status(200).json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};
