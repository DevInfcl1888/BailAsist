import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middlewares.js";
import { otpLimiter } from "../utils/rateLimiter.js";

// User Import
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

// Home Screen Import
import {
  getUserAgencyInfo,
  creatCheckIn,
  checkIn,
  getCheckInStatus,
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
router.route("/agency/:userId").get(authMiddleware, getUserAgencyInfo); // Get Agency Info
router.route("/creatCheckIn").post(authMiddleware, creatCheckIn); // Create Check In
router.route("/checkIn/:checkIn_Id").post(authMiddleware, checkIn); // Check In
router.route("/getCheckInStatus").get(authMiddleware, getCheckInStatus);
export default router;
