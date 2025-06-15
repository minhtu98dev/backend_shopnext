// /src/utils/sendEmail.js
import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  // 1) Tạo một transporter (dịch vụ sẽ gửi email, ở đây là Gmail)
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // 2) Định nghĩa các tùy chọn cho email
  const mailOptions = {
    from: "Your E-commerce App <no-reply@ecommerce.com>",
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html: ... (bạn cũng có thể gửi email dạng HTML)
  };

  // 3) Gửi email
  await transporter.sendMail(mailOptions);
};

export default sendEmail;
