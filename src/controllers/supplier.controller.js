import Supplier from "../models/supplier.model.js";
import { parsePagination, buildListResponse } from "../utils/query-helpers.js";

// GET /api/suppliers?search=&status=&page=&pageSize=
export async function listSuppliers(req, res) {
  try {
    const { page, pageSize, skip } = parsePagination(req.query);
    const { search, status } = req.query;

    const filter = { business: req.businessId };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      Supplier.find(filter).sort({ name: 1 }).skip(skip).limit(pageSize),
      Supplier.countDocuments(filter),
    ]);

    return res.status(200).json(buildListResponse({ data, total, page, pageSize }));
  } catch (err) {
    return res.status(500).json({ message: 'Failed to list suppliers' });
  }
}

// GET /api/suppliers/:id
export async function getSupplier(req, res) {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, business: req.businessId });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    return res.status(200).json({ data: supplier });
  } catch (err) {
    return res.status(400).json({ message: 'Invalid supplier id' });
  }
}

// POST /api/suppliers
export async function createSupplier(req, res) {
  try {
    const { name, contactName, email, phone, address, category, status, rating } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });

    const supplier = await Supplier.create({
      business: req.businessId,
      name,
      contactName,
      email,
      phone,
      address,
      category,
      status,
      rating,
    });

    return res.status(201).json({ data: supplier });
  } catch (err) {
    return res.status(400).json({ message: 'Failed to create supplier' });
  }
}

// PATCH /api/suppliers/:id
export async function updateSupplier(req, res) {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, business: req.businessId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    return res.status(200).json({ data: supplier });
  } catch (err) {
    return res.status(400).json({ message: 'Failed to update supplier' });
  }
}
