import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, select: false }, //select: false Không trả về password khi query
    firebaseUID: {
      type: String,
      unique: true,
      sparse: true,
    }, // sparse: true Cho phép nhiều giá trị null nhưng phải unique nếu tồn tại
    avatar: {
      type: String,
      default: "https://i.pravatar.cc/150",
    },
    isAdmin: {
      type: Boolean,
      default: false,
      required: true,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    passwordChangedAt: Date,
  },
  { timestamps: true }
);
const User = mongoose.model("User", userSchema);

export default User;
