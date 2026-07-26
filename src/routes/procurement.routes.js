import { Router } from "express";
import requireAuth from "../middleware/auth.middleware.js";
import {
  listOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
} from "../controllers/procurement.controller.js";

const procurementRouter = Router();

procurementRouter.use(requireAuth);

procurementRouter.get("/", listOrders);
procurementRouter.get("/:id", getOrder);
procurementRouter.post("/", createOrder);
procurementRouter.patch("/:id/status", updateOrderStatus);

export default procurementRouter;
