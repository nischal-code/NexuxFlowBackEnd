import mongoose from "mongoose";

const inventoryTransactionSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
      index: true,
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['increase', 'decrease', 'adjustment'],
      required: true,
    },
    quantityChange: { type: Number, required: true },
    previousQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    reason: { type: String, trim: true, default: '' },
    // ref: 'users' — matches the model name registered in user.model.js
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  },
  { timestamps: true }
);

inventoryTransactionSchema.index({ business: 1, createdAt: -1 });

const inventoryTransactionModel = mongoose.model('InventoryTransaction', inventoryTransactionSchema);

export default inventoryTransactionModel;
