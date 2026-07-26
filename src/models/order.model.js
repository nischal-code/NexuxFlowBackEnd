import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'shipped', 'received', 'cancelled'],
      default: 'pending',
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    expectedDeliveryDate: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    // ref: 'users' — matches the model name registered in user.model.js
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true
    },
  },
  { timestamps: true }
);

orderSchema.index({ business: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ business: 1, createdAt: -1 });

const orderModel = mongoose.model('Order', orderSchema);

export default orderModel;
