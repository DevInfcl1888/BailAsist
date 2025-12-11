import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

export const otpStore = new Map<string, { hash: string; expiresAt: number }>();

// generate OTP
export const generateOTP = async (email: string): Promise<string> => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOTP = await bcrypt.hash(otp, 10);
  otpStore.set(email, {
    hash: hashedOTP,
    expiresAt:
      Date.now() + (Number(process.env.OTP_EXPIRE_TIME!) || 120) * 1000, // 1 min
  });

  // console.log("OTP store updated:", otpStore);
  return otp;
};

// send OTP
export const sendOTPfun = async (
  email: string,
  otp: string
): Promise<nodemailer.SentMessageInfo> => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return await transporter.sendMail({
    from: `${process.env.FROM_NAME} <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your OTP code",
    html: `<h3>Your OTP code is <b>${otp}</b>. It will expire in 2 minutes.</h3>`,
  });
};
