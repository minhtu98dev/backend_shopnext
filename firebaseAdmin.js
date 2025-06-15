import admin from "firebase-admin";
import "dotenv/config"; // Đảm bảo các biến môi trường được nạp

// 1. Đọc chuỗi JSON từ biến môi trường bạn vừa tạo trên Vercel
const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

// 2. Chuyển chuỗi JSON đó thành một đối tượng JavaScript
const serviceAccount = JSON.parse(serviceAccountString);

// 3. Khởi tạo Firebase Admin với đối tượng đã được parse
// Kiểm tra xem app đã được khởi tạo chưa để tránh lỗi
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
