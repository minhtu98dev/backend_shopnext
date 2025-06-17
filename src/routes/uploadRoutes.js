import express from "express";
import upload from "../../config/cloudinary.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// @route   POST /api/upload
// @desc    Upload an image file
// @access  Private/Admin (Chỉ admin mới được tải ảnh sản phẩm)
router.post("/", protect, admin, upload.array("images", 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    res.status(400);
    throw new Error("Vui lòng chọn một file ảnh");
  }
  // Middleware 'upload.single('image')' đã xử lý việc upload.
  // URL của ảnh trên cloud sẽ nằm trong req.file.path
  const imageUrls = req.files.map((file) => file.path);
  res.status(201).json({
    message: "Tải ảnh lên thành công",
    image: imageUrls,
  });
});

export default router;
