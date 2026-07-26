import mongoose from "mongoose";
import InventoryItem from "../models/inventory-item.model.js";
import InventoryTransaction from "../models/inventory-transaction.model.js";
import { parsePagination, buildListResponse } from "../utils/query-helpers.js";

// GET /api/inventory?search=&category=&page=&pageSize=
export async function listItems(req, res) {
  try {
    const { page, pageSize, skip } = parsePagination(req.query);
    const { search, category, lowStockOnly } = req.query;

    const filter = {
      business:req.businessId
    };
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        {
          name: {
          $regex: search,
          $options: 'i'
        }
        },
        {
          sku:{ $regex: search,
            $options: 'i'
          }
        },
      ];
    }

    let query = InventoryItem.find(filter).sort({ createdAt: -1 }).populate('supplier', 'name');

    if (lowStockOnly === 'true') {
      // $expr needed since we're comparing two fields on the same document
      query = InventoryItem.find({
        ...filter,
        $expr: { $lte: ['$quantity', '$reorderThreshold'] },
      })
        .sort({ createdAt: -1 })
        .populate('supplier', 'name');
    }

    const [data, total] = await Promise.all([
      query.skip(skip).limit(pageSize),
      InventoryItem.countDocuments(
        lowStockOnly === 'true'
          ? { ...filter, $expr: { $lte: ['$quantity', '$reorderThreshold'] } }
          : filter
      ),
    ]);

    return res.status(200).json(buildListResponse({ data, total, page, pageSize }));
  } catch (err) {
    return res.status(500).json({ message: 'Failed to list inventory items' });
  }
}

// GET /api/inventory/:id
export async function getItem(req, res) {
  try {
    const item = await InventoryItem.findOne({
      _id: req.params.id,
      business: req.businessId,
    }).populate('supplier', 'name email phone');

    if (!item) return res.status(404).json({ message: 'Inventory item not found' });
    return res.status(200).json({ data: item });
  } catch (err) {
    return res.status(400).json({ message: 'Invalid inventory item id' });
  }
}

// POST /api/inventory
export async function createItem(req, res) {
  try {
    const { name, sku, category, quantity, unit, reorderThreshold, unitCost, unitPrice, supplier, location } =
      req.body;

    if (!name || !sku) {
      return res.status(400).json({ message: 'name and sku are required' });
    }

    const item = await InventoryItem.create({
      business: req.businessId,
      name,
      sku,
      category,
      quantity: quantity ?? 0,
      unit,
      reorderThreshold: reorderThreshold ?? 10,
      unitCost: unitCost ?? 0,
      unitPrice: unitPrice ?? 0,
      supplier: supplier || null,
      location,
    });

    return res.status(201).json({ data: item });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'SKU already exists for this business' });
    }
    return res.status(400).json({ message: 'Failed to create inventory item' });
  }
}

// PATCH /api/inventory/:id
// NOTE: quantity is intentionally NOT editable here — use /adjust-quantity so every
// quantity change is always paired with an audit-trail InventoryTransaction.
export async function updateItem(req, res) {
  try {
    const { quantity, ...rest } = req.body;

    const item = await InventoryItem.findOneAndUpdate(
      { _id: req.params.id, business: req.businessId },
      { $set: rest },
      { new: true, runValidators: true }
    );

    if (!item) return res.status(404).json({ message: 'Inventory item not found' });
    return res.status(200).json({ data: item });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'SKU already exists for this business' });
    }
    return res.status(400).json({ message: 'Failed to update inventory item' });
  }
}

// DELETE /api/inventory/:id
export async function deleteItem(req, res) {
  try {
    const item = await InventoryItem.findOneAndDelete({
      _id: req.params.id,
      business: req.businessId,
    });

    if (!item) return res.status(404).json({ message: 'Inventory item not found' });
    return res.status(200).json({ message: 'Inventory item deleted' });
  } catch (err) {
    return res.status(400).json({ message: 'Failed to delete inventory item' });
  }
}

// POST /api/inventory/:id/adjust-quantity
// body: { type: 'increase' | 'decrease' | 'adjustment', quantityChange, reason }
// For 'adjustment', quantityChange is treated as the ABSOLUTE new quantity.
export async function adjustQuantity(req, res) {
  const session = await mongoose.startSession();
  try {
    const { type, quantityChange, reason } = req.body;

    if (!['increase', 'decrease', 'adjustment'].includes(type)) {
      return res.status(400).json({ message: 'type must be increase, decrease, or adjustment' });
    }
    if (typeof quantityChange !== 'number') {
      return res.status(400).json({ message: 'quantityChange must be a number' });
    }

    let result;
    await session.withTransaction(async () => {
      const item = await InventoryItem.findOne({
        _id: req.params.id,
        business: req.businessId,
      }).session(session);

      if (!item) {
        throw Object.assign(new Error('Inventory item not found'), { status: 404 });
      }

      const previousQuantity = item.quantity;
      let newQuantity;
      if (type === 'increase') newQuantity = previousQuantity + Math.abs(quantityChange);
      else if (type === 'decrease') newQuantity = previousQuantity - Math.abs(quantityChange);
      else newQuantity = quantityChange; // adjustment = absolute set

      if (newQuantity < 0) {
        throw Object.assign(new Error('Resulting quantity cannot be negative'), { status: 400 });
      }

      item.quantity = newQuantity;
      await item.save({ session });

      const [transaction] = await InventoryTransaction.create(
        [
          {
            business: req.businessId,
            item: item._id,
            type,
            quantityChange: newQuantity - previousQuantity,
            previousQuantity,
            newQuantity,
            reason: reason || '',
            performedBy: req.user._id,
          },
        ],
        { session }
      );

      result = { item, transaction };
    });

    return res.status(200).json({ data: result });
  } catch (err) {
    const status = err.status || 400;
    return res.status(status).json({ message: err.message || 'Failed to adjust quantity' });
  } finally {
    session.endSession();
  }
}
