import jwt from "jsonwebtoken";
import config from "../config/config.js";
import { userModel } from "../models/user.model.js";

/**
 * requireAuth
 * -----------
 * Route-protection middleware for the inventory/procurement/supplier/dashboard
 * modules brought in from backend.zip.
 *
 * It intentionally reuses the SAME access-token contract already established
 * in auth.controller.js (Bearer token in the Authorization header, signed
 * with config.jwt_Secret, payload -> { id, sessionId? }). Nothing in
 * auth.controller.js, otp.model.js, or user.model.js is modified — this file
 * only reads the existing user model to load the authenticated user.
 *
 * This project has no separate "Business" entity/model. Every resource
 * brought over from backend.zip (InventoryItem, Order, Supplier, ...) is
 * scoped by a `business` field, so here each user is scoped to their own
 * data by using their own user id as `req.businessId`.
 */
export async function requireAuth(req, res, next) {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "token not found",
            });
        }

        const decoded = jwt.verify(token, config.jwt_Secret);

        const user = await userModel.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                message: "invalid token",
            });
        }

        if (!user.verified) {
            return res.status(401).json({
                message: "User not verified.",
            });
        }

        req.user = user;
        req.businessId = user._id;

        next();
    } catch (error) {
        return res.status(401).json({
            message: "invalid or expired token",
        });
    }
}

export default requireAuth;
