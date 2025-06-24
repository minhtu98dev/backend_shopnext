import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import admin from "../../firebaseAdmin.js";
import sendEmail from "../utils/sendEmail.js";

// --- HÀM TIỆN ÍCH (HELPER FUNCTION) ---

// Tạo token JWT

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// --- CÁC HÀM CONTROLLER ---

//Register a new user
//POST /api/auth/register
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
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("Dữ liệu người dùng không hợp lệ");
  }
});

//Auth user & get token
//POST /api/auth/login
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Vui lòng điền đầy đủ các trường");
  }

  const user = await User.findOne({ email }).select("+password");

  if (user && (await bcrypt.compare(password, user.password))) {
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

//Login/Register with Firebase
//POST /api/auth/firebase-login
const loginWithFirebase = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    res.status(400);
    throw new Error("No ID token provided");
  }

  const decodedToken = await admin.auth().verifyIdToken(idToken);
  const { uid, email, name } = decodedToken;

  // 1. Tìm user bằng Firebase UID trước
  let user = await User.findOne({ firebaseUid: uid });

  // 2. Nếu không có...
  if (!user) {
    // ...hãy thử tìm bằng email
    user = await User.findOne({ email });

    if (user) {
      // Nếu tìm thấy user có cùng email, hãy LIÊN KẾT tài khoản
      // bằng cách thêm firebaseUid vào document của họ
      user.firebaseUid = uid;
      await user.save();
      console.log(`Linked Firebase UID ${uid} to existing user ${email}`);
    } else {
      // Nếu không tìm thấy bằng cả UID và email, lúc này mới TẠO MỚI
      const salt = await bcrypt.genSalt(10);
      // Dùng một chuỗi ngẫu nhiên an toàn làm mật khẩu placeholder
      const randomPassword = crypto.randomBytes(16).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      user = await User.create({
        firebaseUid: uid, // Giả sử bạn có trường này trong model
        name: name || email.split("@")[0], // Lấy tên từ Firebase hoặc từ email
        email,
        password: hashedPassword,
      });
      console.log(`Created new user ${email} with Firebase UID ${uid}`);
    }
  }

  // 3. Trả về thông tin và token
  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    token: generateToken(user._id),
  });
});

//Forgot password
//POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    res.status(404);
    throw new Error("Không tìm thấy người dùng với email này");
  }

  const resetToken = crypto.randomBytes(32).toString("hex");

  user.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 phút

  await user.save({ validateBeforeSave: false });

  // (Lưu ý: Thay đổi URL cho phù hợp với trang frontend của bạn)
  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/reset-password/${resetToken}`;
  const message = `Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu. Vui lòng nhấn vào link sau để đặt lại mật khẩu:\n\n${resetURL}\n\nNếu bạn không yêu cầu, vui lòng bỏ qua email này! Link chỉ có hiệu lực trong 10 phút.`;

  try {
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
    throw new Error(
      "Có lỗi xảy ra trong quá trình gửi email. Vui lòng thử lại sau."
    );
  }
});

//Reset password
//PUT /api/auth/reset-password/:token
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

  // Mã hóa mật khẩu mới trước khi lưu
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(req.body.password, salt);

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.passwordChangedAt = Date.now();

  await user.save();

  res.status(200).json({
    status: "success",
    message: "Mật khẩu đã được đặt lại thành công.",
  });
});

//Get user profile
//GET /api/auth/profile
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

//Update user profile
//PUT /api/auth/profile
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
///test
export {
  registerUser,
  loginUser,
  loginWithFirebase,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  resetPassword,
};
