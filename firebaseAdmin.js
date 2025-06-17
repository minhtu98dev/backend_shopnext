import admin from "firebase-admin";
import fs from "fs";
import "dotenv/config"; // Nạp biến môi trường từ .env cho local

let serviceAccount;

// Ưu tiên dùng biến môi trường (cho Vercel/Production)
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  console.log("Initializing Firebase with environment variable...");
  // Parse chuỗi JSON từ biến môi trường
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
}
// Nếu không có, dùng file local (cho Development)
else {
  console.log("Initializing Firebase with local file...");
  // Đọc và parse file từ đường dẫn local
  serviceAccount = JSON.parse(
    fs.readFileSync("./config/firebase-service-account.json", "utf8")
  );
}

// Khởi tạo app (kiểm tra để tránh khởi tạo lại gây lỗi)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
