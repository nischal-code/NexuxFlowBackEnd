import mongoose from "mongoose";

// Line items are stored as a separate collection (rather than embedded) so they can be
// queried independently (e.g. "what's on order for item X across all suppliers").
const orderItemSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    inventoryItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      default: null, // null allowed: ordering a brand-new SKU not yet in inventory
    },
    name: { type: String, required: true, trim: true }, // snapshot at time of order
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

const orderItemModel = mongoose.model('OrderItem', orderItemSchema);

export default orderItemModel;
