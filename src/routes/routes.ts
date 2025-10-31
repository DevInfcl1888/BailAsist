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
  addResidenceInfo,
  addContactInfo,
  addLegalInfo,
  addPersonalInfo,
} from "../controller/user.controller.js";

// Home Screen Import
import {
  getUserAgencyInfo,
  creatCheckIn,
  checkIn,
  getCheckInStatus,
  createCourt,
  getCourtDetails,
  updateAddressAndSendPictureAsProof,
  updateLatAndLong,
} from "../controller/homeScreen.controller.js";
import { createAgency } from "../controller/agency.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
const router = Router();

// User Routes
router.route("/registration").post(registration);
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
router.route("/addResidenceInfo").post(authMiddleware, addResidenceInfo);
router.route("/addContactInfo").post(authMiddleware, addContactInfo);
router.route("/addLegalInfo").post(authMiddleware, addLegalInfo);
router.route("/addPersonalInfo").post(authMiddleware, addPersonalInfo);

// Home Screen Routes
router.route("/agency/:userId").get(authMiddleware, getUserAgencyInfo); // Get Agency Info
router.route("/creatCheckIn").post(authMiddleware, creatCheckIn); // Create Check In
router.route("/checkIn/:checkIn_Id").post(authMiddleware, checkIn); // Check In
router.route("/getCheckInStatus").get(authMiddleware, getCheckInStatus); // get all status of your upcoming check-in
router.route("/createCourt").post(authMiddleware, createCourt);
router.route("/getCourtDetails/:courtId").get(authMiddleware, getCourtDetails); // get court details
router.route("/createAgency").post(authMiddleware, createAgency); // get court details
router
  .route("/updateAddressAndSendPictureAsProof")
  .post(
    authMiddleware,
    upload.single("image"),
    updateAddressAndSendPictureAsProof
  ); // update address and send picture as proof

// New Route for updating latitude and longitude
router.route("/updateLatAndLong").post(authMiddleware, updateLatAndLong); // update latitude and longitude

export default router;
