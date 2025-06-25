import express from "express";
const router = express.Router();

import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderToPaid,
  getMyOrders,
  updateOrderToDelivered,
} from "../controllers/orderController.js";

import { protect, admin, optionalAuth } from "../middlewares/authMiddleware.js";

// @route   POST /api/orders (Tạo đơn hàng)
// @route   GET /api/orders (Lấy tất cả đơn hàng - Admin)
router
  .route("/")
  .post(optionalAuth, createOrder)
  .get(protect, admin, getAllOrders);

// @route   GET /api/orders/myorders (Lấy đơn hàng của user)
router.get("/myorders", protect, getMyOrders);

// @route   GET /api/orders/:id (Lấy chi tiết đơn hàng)
router.get("/:id", protect, getOrderById);

// @route   PUT /api/orders/:id/pay (Cập nhật đã thanh toán)
router.put("/:id/pay", protect, updateOrderToPaid);

// @route   PUT /api/orders/:id/deliver (Cập nhật đã giao hàng - Admin)
router.put("/:id/deliver", protect, admin, updateOrderToDelivered);

export default router;
