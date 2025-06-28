import express from "express";
const router = express.Router();

import {
  registerUser,
  loginUser,
  loginWithFirebase,
  getAllUsers,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  resetPassword,
  getUserById,
} from "../controllers/authController.js";

// Sửa lại dòng này: thêm 'admin' vào import
import { protect, admin } from "../middlewares/authMiddleware.js";

// --- Route cho Admin ---
// @route   GET /api/auth
router.get("/", protect, admin, getAllUsers);

// --- Các Route Công khai (Public Routes) ---
// @route   POST /api/auth/register
router.post("/register", registerUser);

// @route   POST /api/auth/login
router.post("/login", loginUser);

// @route   POST /api/auth/firebase-login
router.post("/firebase-login", loginWithFirebase);

// --- Các Route Quên/Đặt lại mật khẩu ---
// @route   POST /api/auth/forgot-password
router.post("/forgot-password", forgotPassword);

// @route   PUT /api/auth/reset-password/:token
router.put("/reset-password/:token", resetPassword);

// --- Các Route Người dùng (Yêu cầu đăng nhập) ---
// @route   GET & PUT /api/auth/profile
router
  .route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);
// @route   GET /api/auth/:id
router.get("/:id", protect, admin, getUserById);
export default router;
