import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import admin from "../../firebaseAdmin.js"; // Đảm bảo đường dẫn đến file config firebase admin của bạn là đúng
import sendEmail from "../utils/sendEmail.js";

/**
 * @desc    Tạo một token JWT cho user ID được cung cấp
 * @param   {string} id - ID của người dùng
 * @returns {string} Token JWT
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

/**
 * @desc    Đăng ký người dùng mới
 * @route   POST /api/auth/register
 * @access  Public
 */
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
    // Trả về cấu trúc lồng nhau để frontend dễ xử lý
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

/**
 * @desc    Xác thực người dùng & lấy token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Vui lòng điền đầy đủ các trường");
  }

  const user = await User.findOne({ email }).select("+password");

  if (user && (await bcrypt.compare(password, user.password))) {
    // Trả về cấu trúc phẳng, khớp với logic xử lý ở frontend
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error("Email hoặc mật khẩu không hợp lệ");
  }
});

/**
 * @desc    Đăng nhập/Đăng ký với Firebase
 * @route   POST /api/auth/firebase-login
 * @access  Public
 */
const loginWithFirebase = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    res.status(400);
    throw new Error("No ID token provided");
  }

  const decodedToken = await admin.auth().verifyIdToken(idToken);
  const { uid, email, name, picture } = decodedToken;

  // SỬA LỖI E11000: Tìm user bằng EMAIL
  let user = await User.findOne({ email: email });

  if (user) {
    // Nếu user đã tồn tại -> chỉ cần đăng nhập
    user.firebaseUid = uid; // Cập nhật để liên kết tài khoản
    await user.save();
  } else {
    // Nếu user chưa tồn tại -> Tạo mới
    const randomPassword = crypto.randomBytes(20).toString("hex");
    user = await User.create({
      firebaseUid: uid,
      name: name || "Firebase User",
      email,
      avatar: picture,
      password: randomPassword,
    });
  }

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    token: generateToken(user._id),
  });
});

/**
 * @desc    Yêu cầu quên mật khẩu
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(200).json({
      status: "success",
      message: "Nếu email tồn tại, link reset sẽ được gửi đi.",
    });
  }

  const resetToken = user.createPasswordResetToken(); // Giả sử bạn có method này trong model
  await user.save({ validateBeforeSave: false });

  try {
    // SỬA LẠI: Dùng biến môi trường cho URL của frontend
    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const message = `Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu. Vui lòng nhấn vào link sau:\n\n${resetURL}\n\nLink chỉ có hiệu lực trong 10 phút.`;

    await sendEmail({
      email: user.email,
      subject: "Yêu cầu đặt lại mật khẩu (Hiệu lực trong 10 phút)",
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
    throw new Error("Có lỗi xảy ra khi gửi email. Vui lòng thử lại sau.");
  }
});

/**
 * @desc    Đặt lại mật khẩu
 * @route   PUT /api/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error("Token không hợp lệ hoặc đã hết hạn");
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(req.body.password, salt);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.status(200).json({
    status: "success",
    message: "Mật khẩu đã được đặt lại thành công.",
  });
});

/**
 * @desc    Lấy thông tin profile người dùng
 * @route   GET /api/auth/profile
 * @access  Private (yêu cầu `protect` middleware)
 */
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    });
  } else {
    res.status(404);
    throw new Error("Không tìm thấy người dùng");
  }
});

/**
 * @desc    Cập nhật thông tin profile người dùng
 * @route   PUT /api/auth/profile
 * @access  Private (yêu cầu `protect` middleware)
 */
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;

    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
      token: generateToken(updatedUser._id),
    });
  } else {
    res.status(404);
    throw new Error("Không tìm thấy người dùng");
  }
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
