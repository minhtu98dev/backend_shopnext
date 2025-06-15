import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

// Cấu hình Cloudinary bằng các biến môi trường bạn vừa thêm
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cấu hình nơi lưu trữ file trên Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "ecommerce-app", // Tên thư mục bạn muốn lưu ảnh trên Cloudinary
    allowed_formats: ["jpeg", "png", "jpg"],
  },
});

// Khởi tạo multer với storage engine đã cấu hình
const upload = multer({ storage: storage });

export default upload;
