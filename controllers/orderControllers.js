// controllers/orderController.js

import Order from "../models/Order.js";
import { sendEmail } from "../utils/sendEmail.js";

/**
 * POST /api/orders/place
 * Body: {
 *   items: [{ name, quantity, price, imageSrc? }],
 *   totalPrice: number,
 *   shippingAddress?: string | {
 *     name?, line1, line2?, city, state?, postalCode?, country, phone?
 *   }
 * }
 * Requires auth; protect middleware must set req.user = { id, email }
 */
export const placeOrder = async (req, res) => {
  try {
    // Ensure authenticated user
    if (!req.user?.id || !req.user?.email) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized. User data is incomplete." });
    }

    const userId = req.user.id;
    const userEmail = String(req.user.email).trim().toLowerCase();

    const { items = [], totalPrice, shippingAddress } = req.body;

    // Basic validations
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Items array is required and cannot be empty." });
    }

    for (const item of items) {
      if (!item?.name || typeof item.quantity !== "number" || typeof item.price !== "number") {
        return res.status(400).json({
          success: false,
          message:
            "Each item must have a name (string), quantity (number), and price (number).",
        });
      }
    }

    if (typeof totalPrice !== "number") {
      return res
        .status(400)
        .json({ success: false, message: "totalPrice must be a number." });
    }

    // Normalize shipping address into a single string for email template
    const shippingAddressStr = (() => {
      if (!shippingAddress) return "Not provided";
      if (typeof shippingAddress === "string") return shippingAddress;
      const { name, line1, line2, city, state, postalCode, country, phone } = shippingAddress;
      return [
        name,
        line1,
        line2,
        [city, state, postalCode].filter(Boolean).join(" "),
        country,
        phone ? `Phone: ${phone}` : null,
      ]
        .filter(Boolean)
        .join(", ");
    })();

    // Generate tracking ID
    const trackingId = `TRK-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    // Persist order (keep schema-safe fields)
    const order = await Order.create({
      userId,
      customerEmail: userEmail,
      items: items.map((it) => ({
        name: it.name,
        quantity: Number(it.quantity),
        price: Number(it.price),
        // imageSrc may not exist in schema; we keep it only for the email below
      })),
      totalPrice: Number(totalPrice),
      trackingId,
      status: "Processing",
    });

    // Fire and forget email (do not block response)
    (async () => {
      try {
        await sendEmail(userEmail, {
          orderId: order._id.toString(),
          // Pass through imageSrc for the email template even if schema ignores it
          items: items.map((it) => ({
            name: it.name,
            quantity: Number(it.quantity),
            price: Number(it.price),
            imageSrc: it.imageSrc || "",
          })),
          totalPrice: order.totalPrice,
          trackingId: order.trackingId,
          shippingAddress: shippingAddressStr,
        });
      } catch (mailErr) {
        console.error("[MAILER] Failed to send order confirmation:", mailErr);
      }
    })();

    return res.status(201).json({ success: true, order });
  } catch (err) {
    console.error("Error placing order:", err);
    return res
      .status(500)
      .json({ success: false, message: "A server error occurred while placing the order." });
  }
};

/**
 * GET /api/orders/track/:trackingId?email=...
 * Public route for order tracking.
 * - If the order has customerEmail stored, it must match the provided email.
 * - If the order has no customerEmail (legacy), allow tracking by ID alone.
 */
export const trackOrder = async (req, res) => {
  try {
    const trackingId = String(req.params.trackingId || "").trim();
    const email = String(req.query.email || "").trim().toLowerCase();

    console.log("[trackOrder] trackingId:", trackingId, "email:", email);

    if (!trackingId || !email) {
      return res
        .status(400)
        .json({ success: false, message: "Tracking ID and billing email are required." });
    }

    // Find by trackingId
    const order = await Order.findOne({ trackingId }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    // Enforce email match if stored
    if (order.customerEmail && order.customerEmail !== email) {
      return res.status(404).json({
        success: false,
        message: "Order not found or email does not match the record.",
      });
    }

    return res.json({
      success: true,
      order: {
        trackingId: order.trackingId,
        status: order.status,
        items: order.items,
        totalPrice: order.totalPrice,
        createdAt: order.createdAt,
        customerEmail: order.customerEmail,
      },
    });
  } catch (err) {
    console.error("trackOrder error:", err);
    return res.status(500).json({
      success: false,
      message:
        "A server error occurred while fetching the order. Please try again later.",
    });
  }
};

// DELETE /api/orders/admin/:id  (admin only)
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }

    return res
      .status(200)
      .json({ success: true, message: "Order deleted successfully." });
  } catch (err) {
    console.error("Error deleting order:", err);
    return res.status(500).json({
      success: false,
      message: "A server error occurred while deleting the order.",
    });
  }
};

/**
 * GET /api/orders/my-orders  (protected)
 * Returns orders for the authenticated user.
 */
export const getUserOrders = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Not authorized." });
    }

    const orders = await Order.find({ userId: req.user.id }).lean();
    return res.status(200).json({ success: true, orders });
  } catch (err) {
    console.error("Error getting user orders:", err);
    return res.status(500).json({
      success: false,
      message: "A server error occurred while fetching your orders.",
    });
  }
};

/**
 * GET /api/orders/admin/all-orders  (admin)
 */
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).lean();
    return res.status(200).json({ success: true, orders });
  } catch (err) {
    console.error("Error getting all orders:", err);
    return res.status(500).json({
      success: false,
      message: "A server error occurred while fetching all orders.",
    });
  }
};

/**
 * PUT /api/orders/admin/:id  (admin)
 * Body: { status }
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res
        .status(400)
        .json({ success: false, message: "Status is required." });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).lean();

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }

    // OPTIONAL: send a status update email
    // try {
    //   if (order.customerEmail) {
    //     await sendEmail(order.customerEmail, {
    //       orderId: order._id.toString(),
    //       items: order.items,
    //       totalPrice: order.totalPrice,
    //       trackingId: order.trackingId,
    //       shippingAddress: "—",
    //     });
    //   }
    // } catch (e) {
    //   console.error("[MAILER] Failed to send status email:", e);
    // }

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully.",
      order,
    });
  } catch (err) {
    console.error("Error updating order status:", err);
    return res.status(500).json({
      success: false,
      message: "A server error occurred while updating the order status.",
    });
  }
};
