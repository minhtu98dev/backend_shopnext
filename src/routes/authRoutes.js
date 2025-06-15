import express from "express";
const router = express.Router();
import {
  registerUser,
  loginUser,
  loginWithFirebase,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/firebase-login", loginWithFirebase);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);
// get user profile and update user profile
router
  .route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

export default router;
