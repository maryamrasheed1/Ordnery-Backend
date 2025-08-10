import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    items: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
      },
    ],

    totalPrice: { type: Number, required: true, min: 0 },

    // This is the correct, cleaner way to define the index
    trackingId: { type: String, unique: true, required: true },

    customerEmail: { type: String, lowercase: true, trim: true },
    shippingAddress: {
      firstName: String,
      lastName: String,
      address: String,
      city: String,
      phone: String,
      email: { type: String, lowercase: true, trim: true },
      notes: String,
    },

    status: {
      type: String,
      enum: ["Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Processing",
    },
  },
  { timestamps: true }
);

// You must remove this line, as it is now a duplicate.
// orderSchema.index({ trackingId: 1 }, { unique: true });

export default mongoose.model("Order", orderSchema);
