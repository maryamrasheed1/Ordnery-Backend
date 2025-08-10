
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Admin from "../models/Admin.js"; // Import the Admin model

// Middleware to protect routes for both Users and Admins
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if the token belongs to a User or an Admin
      req.user = await User.findById(decoded.id).select("-password");
      req.admin = await Admin.findById(decoded.id).select("-password");
      
      // If no user or admin is found with the decoded ID, it's an invalid token
      if (!req.user && !req.admin) {
        return res.status(401).json({ success: false, msg: "Not authorized, token failed" });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ success: false, msg: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, msg: "Not authorized, no token" });
  }
};

// Middleware to check if the authenticated user is an Admin
export const admin = (req, res, next) => {
  // Check if an admin object exists from the 'protect' middleware
  // We can assume that if req.admin is populated, the user has been authenticated as an admin.
  if (req.admin && req.admin._id) { 
    next();
  } else {
    // If req.admin is not populated, it means the user is not an admin
    return res.status(403).json({ success: false, msg: "Not authorized as an admin" });
  }
};