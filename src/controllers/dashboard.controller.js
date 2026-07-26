import InventoryItem from "../models/inventory-item.model.js";
import InventoryTransaction from "../models/inventory-transaction.model.js";
import Order from "../models/order.model.js";
import Supplier from "../models/supplier.model.js";

// GET /api/dashboard/summary
// Single aggregate endpoint so the dashboard page can do one fetch instead of
// juggling four separate loading states.
export async function getSummary(req, res) {
  try {
    const businessId = req.businessId;

    const [inventoryAgg, pendingOrders, activeSuppliers, lowStockItems] = await Promise.all([
      InventoryItem.aggregate([
        { $match: { business: businessId } },
        {
          $group: {
            _id: null,
            totalValue: { $sum: { $multiply: ['$quantity', '$unitCost'] } },
            totalItems: { $sum: 1 },
          },
        },
      ]),
      Order.countDocuments({ business: businessId, status: 'pending' }),
      Supplier.countDocuments({ business: businessId, status: 'active' }),
      InventoryItem.find({
        business: businessId,
        $expr: { $lte: ['$quantity', '$reorderThreshold'] },
      })
        .sort({ quantity: 1 })
        .limit(5)
        .select('name sku quantity reorderThreshold unit'),
    ]);

    const totalInventoryValue = inventoryAgg[0]?.totalValue || 0;
    const totalItems = inventoryAgg[0]?.totalItems || 0;

    // Sustainability Score is still owned by Phase 3 (no SustainabilityMetric model yet) —
    // left as a clearly-marked placeholder, do not remove this comment.
    const sustainabilityScore = null;

    return res.status(200).json({
      data: {
        stats: {
          totalInventoryValue,
          totalItems,
          pendingOrders,
          activeSuppliers,
          sustainabilityScore, // placeholder: Phase 3 owner wires this up
        },
        lowStockItems,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load dashboard summary' });
  }
}

// GET /api/dashboard/activity?limit=10
// Merges recent InventoryTransactions + Orders into one reverse-chronological feed.
export async function getActivity(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const businessId = req.businessId;

    const [transactions, orders] = await Promise.all([
      InventoryTransaction.find({ business: businessId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('item', 'name sku')
        // NOTE: user model (user.model.js) exposes "username", not "name"
        .populate('performedBy', 'username'),
      Order.find({ business: businessId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('supplier', 'name'),
    ]);

    const feed = [
      ...transactions.map((t) => ({
        type: 'inventory_transaction',
        id: t._id,
        message: `${t.type} of ${Math.abs(t.quantityChange)} for ${t.item?.name || 'an item'}`,
        actor: t.performedBy?.username || 'Unknown',
        createdAt: t.createdAt,
      })),
      ...orders.map((o) => ({
        type: 'order',
        id: o._id,
        message: `Order ${o.orderNumber} (${o.status}) — ${o.supplier?.name || 'unknown supplier'}`,
        actor: null,
        createdAt: o.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    return res.status(200).json({ data: feed });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load activity feed' });
  }
}
