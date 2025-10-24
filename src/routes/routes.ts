import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middlewares.js";
import { otpLimiter } from "../utils/rateLimiter.js";
import {
  registration,
  login,
  logout,
  changePassword,
  getUserProfile,
  updateUserDetails,
  sendOTP,
  deleteUserProfile,
  verifyOTP,
  getdata,
  resetPassword,
} from "../controller/user.controller.js";

import {
  getUserAgencyInfo,
  checkIn,
} from "../controller/homeScreen.controller.js";

const router = Router();

// User Routes
router.route("/regitration").post(registration);
router.route("/login").post(login);
router.route("/logout").post(logout);
router.route("/changePassword").patch(authMiddleware, changePassword);
router.route("/resetPassword").patch(resetPassword);
router.route("/getUserProfile").get(authMiddleware, getUserProfile);
router.route("/updateUserDetails").patch(authMiddleware, updateUserDetails);
router.route("/sendOTP").post(otpLimiter, sendOTP);
router.route("/verifyOTP").post(verifyOTP);
router.route("/deleteUserProfile").delete(authMiddleware, deleteUserProfile);
router.route("/getdata").get(authMiddleware, getdata);


// Home Screen Routes
router
  .route("/agency/:userId")
  .get(authMiddleware, getUserAgencyInfo); // Get Agency Info
router
  .route("/checkin/:userId")
  .post(authMiddleware, checkIn); // Check In
export default router;
