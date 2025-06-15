import express from "express";
import upload from "../../config/cloudinary.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// @route   POST /api/upload
// @desc    Upload an image file
// @access  Private/Admin (Chỉ admin mới được tải ảnh sản phẩm)
router.post("/", protect, admin, upload.single("image"), (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("Vui lòng chọn một file ảnh");
  }
  // Middleware 'upload.single('image')' đã xử lý việc upload.
  // URL của ảnh trên cloud sẽ nằm trong req.file.path
  res.status(201).json({
    message: "Tải ảnh lên thành công",
    image: req.file.path,
  });
});

export default router;
