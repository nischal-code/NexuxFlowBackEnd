import { Router } from "express";
import requireAuth from "../middleware/auth.middleware.js";
import {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
} from "../controllers/supplier.controller.js";

const supplierRouter = Router();

supplierRouter.use(requireAuth);

supplierRouter.get("/", listSuppliers);
supplierRouter.get("/:id", getSupplier);
supplierRouter.post("/", createSupplier);
supplierRouter.patch("/:id", updateSupplier);

export default supplierRouter;
