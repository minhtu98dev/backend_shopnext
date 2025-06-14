import express from "express";
const router = express.Router();

import {
  getProducts,
  getProductById,
  createProductReview,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";

import { protect, admin } from "../middlewares/authMiddleware.js";

// Get all products and create a new product
router.route("/").get(getProducts).post(protect, admin, createProduct);

// Get product by ID and update and delete product
router
  .route("/:id")
  .get(getProductById)
  .delete(protect, admin, deleteProduct)
  .put(protect, admin, updateProduct);

// Create product review
router.route("/:id/reviews").post(protect, createProductReview);

export default router;
