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

// Tạo đơn hàng mới (cho cả user và guest)
router.route("/").post(optionalAuth, createOrder);

// Lấy danh sách đơn hàng của user đang đăng nhập
router.route("/myorders", protect, getMyOrders);

// Lấy chi tiết một đơn hàng bằng ID
router.route("/:id").get(protect, getOrderById);

// Cập nhật trạng thái đã thanh toán
router.route("/:id/pay").put(protect, updateOrderToPaid);

// Cập nhật trạng thái đã giao hàng (chỉ Admin)
router.route("/:id/deliver").put(protect, admin, updateOrderToDelivered);

export default router;
