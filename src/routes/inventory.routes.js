import { Router } from "express";
import requireAuth from "../middleware/auth.middleware.js";
import {
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  adjustQuantity,
} from "../controllers/inventory.controller.js";

const inventoryRouter = Router();

inventoryRouter.use(requireAuth);

inventoryRouter.get("/", listItems);
inventoryRouter.get("/:id", getItem);
inventoryRouter.post("/", createItem);
inventoryRouter.patch("/:id", updateItem);
inventoryRouter.delete("/:id", deleteItem);
inventoryRouter.post("/:id/adjust-quantity", adjustQuantity);

export default inventoryRouter;
