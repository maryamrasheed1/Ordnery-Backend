import User from "../models/User.js";
import Order from "../models/Order.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_VERIFICATION_HOST,
  port: parseInt(process.env.EMAIL_VERIFICATION_PORT, 10),
  secure: process.env.EMAIL_VERIFICATION_SECURE === "true",
  auth: {
    user: process.env.EMAIL_VERIFICATION_USER,
    pass: process.env.EMAIL_VERIFICATION_PASS,
  },
});

const sendVerificationEmail = async (email, verificationLink) => {
  const mailOptions = {
    from: process.env.EMAIL_VERIFICATION_USER,
    to: email,
    subject: "Verify Your Account for The Ordnery",
    html: `<p>Dear User,</p>
           <p>Thank you for registering with The Ordnery!</p>
           <p>Please click on the following link to verify your email and set your password:</p>
           <p><a href="${verificationLink}">${verificationLink}</a></p>
           <p>This link will expire in 1 hour.</p>
           <p>If you did not register for this account, please ignore this email.</p>
           <p>Best regards,<br/>The Ordnery Team</p>`,
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending verification email:", error);
  }
};

// REGISTER
export const registerUser = async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();

    if (!name || !email) {
      return res
        .status(400)
        .json({ success: false, msg: "Name and email are required" });
    }

    const exist = await User.findOne({ email });
    if (exist) {
      if (!exist.isVerified) {
        exist.verificationToken = crypto.randomBytes(32).toString("hex");
        exist.verificationTokenExpires = Date.now() + 3600000; // 1h
        await exist.save();

        const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${exist.verificationToken}`;
        await sendVerificationEmail(email, verificationLink);

        return res.status(200).json({
          success: true,
          msg:
            "User already exists but not verified. A new verification link has been sent to your email.",
        });
      }
      return res
        .status(400)
        .json({ success: false, msg: "User already exists and is verified. Please log in." });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");

    await User.create({
      name,
      email,
      isVerified: false,
      verificationToken,
      verificationTokenExpires: Date.now() + 3600000, // 1h
    });

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    await sendVerificationEmail(email, verificationLink);

    res.status(201).json({
      success: true,
      msg: "Registration successful! A verification link has been sent to your email address.",
    });
  } catch {
    res.status(500).json({ success: false, msg: "Server error during registration" });
  }
};

// VERIFY EMAIL → just redirect to set-password; do NOT clear token yet
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid or expired verification token." });
    }
    // Keep token intact so setPassword can find the same user.
    res.redirect(`${process.env.FRONTEND_URL}/set-password?token=${token}`);
  } catch {
    res.status(500).json({ success: false, msg: "Server error during email verification" });
  }
};

// SET PASSWORD (after email verify)
export const setPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!newPassword) {
      return res
        .status(400)
        .json({ success: false, msg: "New password is required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        msg: "Password must be at least 6 characters long.",
      });
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid or used token." });
    }

    // Assign plain; hook will hash once
    user.password = newPassword;
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.json({
      success: true,
      msg: "Password set successfully. You can now log in.",
    });
  } catch (err) {
    console.error("Server error during password setting:", err);
    res
      .status(500)
      .json({ success: false, msg: "Server error during password setting" });
  }
};

// LOGIN
export const loginUser = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const { password } = req.body;

    const user = await User.findOne({ email }); // password selected by default
    if (!user) return res.status(400).json({ success: false, msg: "Invalid credentials" });

    if (!user.isVerified) {
      return res
        .status(403)
        .json({ success: false, msg: "Please verify your email first." });
    }

    if (!user.password) {
      return res.status(400).json({ success: false, msg: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ success: false, msg: "Invalid credentials" });

    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
         isVerified: user.isVerified,
      },
    });
  } catch {
    res.status(500).json({ success: false, msg: "Server error during login" });
  }
};

// FORGOT PASSWORD
export const forgotPassword = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const user = await User.findOne({ email });

    // Respond 200 regardless
    if (!user) {
      return res.status(200).json({
        success: true,
        msg:
          "If an account with that email exists, a password reset link has been sent.",
      });
    }

    user.resetPasswordToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordExpires = Date.now() + 3600000; // 1h
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${user.resetPasswordToken}`;
    const mailOptions = {
      from: process.env.EMAIL_VERIFICATION_USER,
      to: user.email,
      subject: "Password Reset for The Ordnery",
      html: `<p>Dear ${user.name},</p>
             <p>You requested a password reset. Click the link to set a new password:</p>
             <p><a href="${resetLink}">${resetLink}</a></p>
             <p>This link will expire in 1 hour.</p>
             <p>If you did not request this, please ignore this email.</p>
             <p>Best regards,<br/>The Ordnery Team</p>`,
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error(`Error sending password reset email to ${user.email}:`, emailError);
    }

    res.status(200).json({
      success: true,
      msg:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res
      .status(500)
      .json({ success: false, msg: "Server error during password reset request" });
  }
};

// RESET PASSWORD
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ success: false, msg: "Token and new password are required." });
    }
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ success: false, msg: "Password must be at least 6 characters long." });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid or expired password reset token." });
    }

    // Assign plain; hook will hash once
    user.password = newPassword;
    user.isVerified = true;  
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({
      success: true,
      msg: "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res
      .status(500)
      .json({ success: false, msg: "Server error during password reset" });
  }
};

// PLACE ORDER (protected)
export const placeOrder = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res
        .status(401)
        .json({ message: "Authentication required to place an order." });
    }

    const userId = req.user._id;
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Order must contain items." });
    }

    for (const item of items) {
      if (
        !item.name ||
        typeof item.quantity !== "number" ||
        item.quantity <= 0 ||
        typeof item.price !== "number" ||
        item.price < 0
      ) {
        return res.status(400).json({
          message:
            "Each item must have a name, a positive quantity, and a non-negative price.",
        });
      }
    }

    const totalPrice = items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
    const trackingId = `TRK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newOrder = new Order({
      userId,
      items,
      totalPrice,
      trackingId,
      status: "Processing",
    });

    await newOrder.save();

    const user = await User.findById(userId);
    if (user?.email) {
      const mailOptions = {
        from: process.env.EMAIL_VERIFICATION_USER,
        to: user.email,
        subject: "Your Order Confirmation from The Ordnery",
        html: `<p>Dear ${req.user.name || "Customer"},</p>
               <p>Thank you for your order with The Ordnery! Your order #${newOrder.trackingId} has been placed successfully.</p>
               <p><strong>Order Details:</strong></p>
               <ul>${newOrder.items
                 .map(
                   (i) =>
                     `<li>${i.name} (Qty: ${i.quantity}) - $${i.price.toFixed(
                       2
                     )} each</li>`
                 )
                 .join("")}</ul>
               <p><strong>Total Price:</strong> $${newOrder.totalPrice.toFixed(
                 2
               )}</p>
               <p><strong>Order Status:</strong> ${newOrder.status}</p>
               <p>We will notify you once your order has been shipped.</p>
               <p>Best regards,<br/>The Ordnery Team</p>`,
      };
      try {
        await transporter.sendMail(mailOptions);
      } catch (emailError) {
        console.error("Error sending order confirmation:", emailError);
      }
    }

    res.status(201).json({   success: true, message: "Order placed successfully", order: newOrder });
  } catch (error) {
    console.error("Error placing order:", error);
    res
      .status(500)
      .json({ message: "Failed to place order", error: error.message });
  }
};

// GET ORDER HISTORY (protected)
export const getOrderHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    if (!orders || orders.length === 0) {
      return res
        .status(200)
        .json({ message: "No orders found for this user.", orders: [] });
    }
    res.status(200).json(orders);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch order history", error: error.message });
  }
};export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user._id,        // make sure it belongs to the logged-in user
    });

    if (!order) {
      return res.status(404).json({ success: false, msg: "Order not found" });
    }

    res.json({ success: true, order });
  } catch (e) {
    console.error("getOrderById error:", e);
    res.status(500).json({ success: false, msg: "Failed to fetch order" });
  }
};
