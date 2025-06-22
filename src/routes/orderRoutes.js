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
router.post("/", optionalAuth, createOrder);

// Lấy danh sách đơn hàng của user đang đăng nhập
router.get("/myorders", protect, getMyOrders);

// Lấy chi tiết một đơn hàng bằng ID
router.get("/:id", protect, getOrderById);

// Cập nhật trạng thái đã thanh toán
router.put("/:id/pay", protect, updateOrderToPaid);

// Cập nhật trạng thái đã giao hàng (chỉ Admin)
router.put("/:id/deliver", protect, admin, updateOrderToDelivered);

export default router;
