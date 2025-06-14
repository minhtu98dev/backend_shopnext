import express from "express";
const router = express.Router();
import {
  createOrder,
  getOrderById,
  updateOrderToPaid,
  getMyOrders,
  updateOrderToDelivered,
} from "../controllers/orderController.js";

import { protect, admin, optionalAuth } from "../middlewares/authMiddleware.js";

// Create new order and get all orders
router.route("/").post(optionalAuth, createOrder);

// Get order by user login
router.route("/myorders", protect, getMyOrders);

//get order by id
router.route("/:id").get(protect, getOrderById);

// Update order to paid
router.route("/:id/pay").put(protect, updateOrderToPaid);

// Update order to delivered
router.route("/:id/deliver").put(protect, admin, updateOrderToDelivered);

export default router;
