import jwt from "jsonwebtoken";
import User from "../models/userModel.js"; // Đảm bảo đường dẫn đúng
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import admin from "../../firebaseAdmin.js"; // Đảm bảo đường dẫn đúng
import sendEmail from "../utils/sendEmail.js"; // Đảm bảo đường dẫn đúng

// --- HÀM TIỆN ÍCH (HELPER FUNCTION) ---
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// --- CÁC HÀM CONTROLLER ---

// @desc    Register a new user
// @route   POST /api/auth/register
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Vui lòng điền đầy đủ các trường");
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("Người dùng đã tồn tại");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
  });

  if (user) {
    // SỬA LẠI: Trả về cấu trúc lồng nhau để frontend dễ xử lý
    res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
      },
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("Dữ liệu người dùng không hợp lệ");
  }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
const loginUser = asyncHandler(async (req, res) => {
  // ... logic của bạn đã đúng, giữ nguyên ...
});

// @desc    Login/Register with Firebase
// @route   POST /api/auth/firebase-login
const loginWithFirebase = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    res.status(400);
    throw new Error("No ID token provided");
  }

  const decodedToken = await admin.auth().verifyIdToken(idToken);
  const { uid, email, name, picture } = decodedToken;

  // SỬA LỖI E11000: Tìm user bằng EMAIL, không phải bằng firebaseUid
  let user = await User.findOne({ email: email });

  if (user) {
    // Nếu user đã tồn tại (ví dụ: đăng ký bằng email/pass trước đó)
    // -> Chỉ cần đăng nhập cho họ.
    // Có thể cập nhật thêm firebaseUid và avatar nếu muốn
    user.firebaseUid = uid; // Liên kết tài khoản
    user.avatar = user.avatar || picture;
    await user.save();
  } else {
    // Nếu user chưa tồn tại -> Tạo mới
    // Mã hóa một mật khẩu ngẫu nhiên vì schema yêu cầu có password
    const randomPassword = crypto.randomBytes(20).toString("hex");

    user = await User.create({
      firebaseUid: uid,
      name: name || "Firebase User",
      email,
      avatar: picture,
      password: randomPassword, // Schema yêu cầu password, ta tạo một cái ngẫu nhiên
    });
  }

  // Trả về thông tin user và token
  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    token: generateToken(user._id),
  });
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    // Vẫn trả về success để tránh kẻ xấu dò email
    return res.status(200).json({
      status: "success",
      message: "Nếu email tồn tại, token đặt lại mật khẩu đã được gửi đi!",
    });
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    // SỬA LẠI: Dùng biến môi trường cho URL của frontend
    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const message = `Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu. Vui lòng nhấn vào link sau để đặt lại mật khẩu:\n\n${resetURL}\n\nNếu bạn không yêu cầu, vui lòng bỏ qua email này! Link chỉ có hiệu lực trong 10 phút.`;

    await sendEmail({
      email: user.email,
      subject: "Yêu cầu đặt lại mật khẩu (Có hiệu lực trong 10 phút)",
      message,
    });
    res.status(200).json({
      status: "success",
      message: "Token đặt lại mật khẩu đã được gửi đến email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.error(err);
    throw new Error("Có lỗi xảy ra trong quá trình gửi email.");
  }
});

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
const resetPassword = asyncHandler(async (req, res) => {
  // ... logic của bạn đã đúng, giữ nguyên ...
});

// @desc    Get user profile
// @route   GET /api/auth/profile
const getUserProfile = asyncHandler(async (req, res) => {
  // ... logic của bạn đã đúng, giữ nguyên ...
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
const updateUserProfile = asyncHandler(async (req, res) => {
  // ... logic của bạn đã đúng, giữ nguyên ...
});

export {
  registerUser,
  loginUser,
  loginWithFirebase,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  resetPassword,
};
