import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true, default: 0 },
    status: { 
      type: String, 
      enum: ['Active', 'Inactive'], 
      default: 'Active' 
    },
    description: { type: String },
    category: { type: String },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model('Product', productSchema); // Capitalize 'Product' here

export default Product;
