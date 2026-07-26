import mongoose from "mongoose";

// NOTE: original model referenced ref: 'Business'. This project has no
// separate Business model — a user IS the business/tenant scope — so the
// ref points at the existing "users" model registered in user.model.js.
const inventoryItemSchema = new mongoose.Schema(
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
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    category: {
      type: String,
      trim: true,
      default: 'General'
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    unit: {
      type: String,
      trim: true,
      default: 'unit'
    },
    reorderThreshold: {
      type: Number,
      required: true,
      default: 10,
      min: 0
    },
    unitCost: {
      type: Number,
      default: 0,
      min: 0
    },
    unitPrice: {
      type: Number,
      default: 0,
      min: 0
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null
    },
    location: {
      type: String,
      trim: true,
      default: ''
    },
  },
  { timestamps: true }
);

// SKU is unique per business, not globally
inventoryItemSchema.index({ business: 1, sku: 1 }, { unique: true });
// Support text search on name/sku/category
inventoryItemSchema.index({ name: 'text', sku: 'text', category: 'text' });

inventoryItemSchema.virtual('isLowStock').get(function () {
  return this.quantity <= this.reorderThreshold;
});

inventoryItemSchema.set('toJSON', { virtuals: true });

const inventoryItemModel = mongoose.model('InventoryItem', inventoryItemSchema);

export default inventoryItemModel;
