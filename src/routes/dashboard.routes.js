import { Router } from "express";
import requireAuth from "../middleware/auth.middleware.js";
import { getSummary, getActivity } from "../controllers/dashboard.controller.js";

const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/summary", getSummary);
dashboardRouter.get("/activity", getActivity);

export default dashboardRouter;
