import { Router } from "express";
import requireAuth from "../middleware/auth.middleware.js";
import { sendChatMessage } from "../controllers/chat.controller.js";

const chatRouter = Router();

chatRouter.use(requireAuth);

chatRouter.post("/", sendChatMessage);

export default chatRouter;
