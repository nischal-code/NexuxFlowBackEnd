import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    contactName: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    category: {
      type: String,
      trim: true,
      default: 'General'
    },
    status: { type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
  },
  { timestamps: true }
);

supplierSchema.index({
  business: 1,
  name: 'text',
  category: 'text'
});

const supplierModel = mongoose.model('Supplier', supplierSchema);

export default supplierModel;
