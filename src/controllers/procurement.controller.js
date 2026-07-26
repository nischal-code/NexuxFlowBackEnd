import mongoose from "mongoose";
import Order from "../models/order.model.js";
import OrderItem from "../models/order-item.model.js";
import Supplier from "../models/supplier.model.js";
import { parsePagination, buildListResponse } from "../utils/query-helpers.js";

function generateOrderNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PO-${stamp}-${rand}`;
}

// GET /api/orders?status=&supplier=&page=&pageSize=
export async function listOrders(req, res) {
  try {
    const { page, pageSize, skip } = parsePagination(req.query);
    const { status, supplier } = req.query;

    const filter = { business: req.businessId };
    if (status) filter.status = status;
    if (supplier) filter.supplier = supplier;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate('supplier', 'name email')
        // NOTE: user model (user.model.js) exposes "username", not "name"
        .populate('createdBy', 'username email'),
      Order.countDocuments(filter),
    ]);

    // Attach item counts in bulk rather than N+1 queries
    const orderIds = orders.map((o) => o._id);
    const itemCounts = await OrderItem.aggregate([
      { $match: { order: { $in: orderIds } } },
      { $group: { _id: '$order', itemCount: { $sum: 1 } } },
    ]);
    const countMap = new Map(itemCounts.map((c) => [String(c._id), c.itemCount]));

    const data = orders.map((o) => ({
      ...o.toObject(),
      itemCount: countMap.get(String(o._id)) || 0,
    }));

    return res.status(200).json(buildListResponse({ data, total, page, pageSize }));
  } catch (err) {
    return res.status(500).json({ message: 'Failed to list orders' });
  }
}

// GET /api/orders/:id
export async function getOrder(req, res) {
  try {
    const order = await Order.findOne({ _id: req.params.id, business: req.businessId })
      .populate('supplier', 'name email phone')
      .populate('createdBy', 'username email');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const items = await OrderItem.find({ order: order._id, business: req.businessId });

    return res.status(200).json({ data: { ...order.toObject(), items } });
  } catch (err) {
    return res.status(400).json({ message: 'Invalid order id' });
  }
}

// POST /api/orders
// body: { supplier, expectedDeliveryDate, notes, items: [{ inventoryItem?, name, quantity, unitCost }] }
export async function createOrder(req, res) {
  const session = await mongoose.startSession();
  try {
    const { supplier, expectedDeliveryDate, notes, items } = req.body;

    if (!supplier) return res.status(400).json({ message: 'supplier is required' });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one line item is required' });
    }

    const supplierDoc = await Supplier.findOne({ _id: supplier, business: req.businessId });
    if (!supplierDoc) return res.status(404).json({ message: 'Supplier not found' });

    let createdOrder;
    let createdItems;

    await session.withTransaction(async () => {
      const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

      const [order] = await Order.create(
        [
          {
            business: req.businessId,
            orderNumber: generateOrderNumber(),
            supplier,
            status: 'pending',
            totalAmount,
            expectedDeliveryDate: expectedDeliveryDate || null,
            notes: notes || '',
            createdBy: req.user._id,
          },
        ],
        { session }
      );

      const itemDocs = items.map((i) => ({
        business: req.businessId,
        order: order._id,
        inventoryItem: i.inventoryItem || null,
        name: i.name,
        quantity: i.quantity,
        unitCost: i.unitCost,
        subtotal: i.quantity * i.unitCost,
      }));

      createdItems = await OrderItem.insertMany(itemDocs, { session });
      createdOrder = order;
    });

    return res.status(201).json({ data: { ...createdOrder.toObject(), items: createdItems } });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Failed to create order' });
  } finally {
    session.endSession();
  }
}

// PATCH /api/orders/:id/status
// body: { status: 'pending' | 'approved' | 'shipped' | 'received' | 'cancelled' }
export async function updateOrderStatus(req, res) {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'approved', 'shipped', 'received', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `status must be one of ${validStatuses.join(', ')}` });
    }

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, business: req.businessId },
      { $set: { status } },
      { new: true }
    );

    if (!order) return res.status(404).json({ message: 'Order not found' });
    return res.status(200).json({ data: order });
  } catch (err) {
    return res.status(400).json({ message: 'Failed to update order status' });
  }
}
