import { Router } from "express";
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
  uninstalled
} from "../controller/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middlewares.js";
import { otpLimiter } from "../utils/rateLimiter.js";

const router = Router();

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

// dummy testing
router.route("/fcm/uninstalled").post(uninstalled);

export default router;
