import {
  adminSignUp,
  adminLogin,
  adminLoginAsBondsman,
  adminLogoutAsBondsman,
  uploadAds,
} from "../controller/admin.controller.js";
import { Router } from "express";
import { authMiddlewareForWeb } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { otpLimiter } from "../utils/rateLimiter.js";

const router = Router();

// Admin routes
router.route("/adminSignUp").post(adminSignUp); // Admin Sign Up
router.route("/adminLogin").post(adminLogin); // Admin Login
router
  .route("/adminLoginAsBondsman/:bondsmanId")
  .post(authMiddlewareForWeb, adminLoginAsBondsman); // admin Login As Bondsman Login
router
  .route("/adminLogoutAsBondsman")
  .post(authMiddlewareForWeb, adminLogoutAsBondsman); // admin logout As Bondsman Login
router
  .route("/uploadAds")
  .post(authMiddlewareForWeb, upload.single("adImg"), uploadAds); // upload ads

export default router;
