import { Router } from "express";
import {
  authMiddleware,
  authMiddlewareForWeb,
} from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";
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
  addDriverLicInfo,
  addPersonalRefrenceInfo,
  addEmployementStatus,
} from "../controller/user.controller.js";

// Home Screen Import
import {
  getUserBondsmanInfo,
  checkIn,
  getCheckInStatus,
  createCourt,
  getCourtDetails,
  updateAddressAndSendPictureAsProof,
  updateLatAndLong,
} from "../controller/homeScreen.controller.js";
import {
  signUpAsBondsman,
  loginAsBondsman,
  creatCheckIn,
  searchByPhoneNumber,
  deleteCheckIn,
  // getRecentCheckedInByUser,
} from "../controller/bondsman.controller.js";

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
router.route("/addDriverLicInfo").post(authMiddleware, addDriverLicInfo);
router
  .route("/addPersonalRefrenceInfo")
  .post(authMiddleware, addPersonalRefrenceInfo);
router
  .route("/addEmployementStatus")
  .post(authMiddleware, addEmployementStatus);

// Home Screen Routes
router.route("/bondsman/:userId").get(authMiddleware, getUserBondsmanInfo); // Get Agency Info
router.route("/checkIn/:checkIn_Id").post(authMiddleware, checkIn); // Check In
router.route("/getCheckInStatus").get(authMiddleware, getCheckInStatus); // get all status of your upcoming check-in
router.route("/createCourt").post(authMiddleware, createCourt);
router.route("/getCourtDetails/:courtId").get(authMiddleware, getCourtDetails); // get court details
router
  .route("/updateAddressAndSendPictureAsProof")
  .post(
    authMiddleware,
    upload.single("image"),
    updateAddressAndSendPictureAsProof
  ); // update address and send picture as proof
router.route("/updateLatAndLong").post(authMiddleware, updateLatAndLong); // update latitude and longitude

// Bondsman screen
router.route("/signUpAsBondsman").post(signUpAsBondsman); // sign Up
router.route("/loginAsBondsman").post(loginAsBondsman); // login
router.route("/creatCheckIn/:userId").post(authMiddlewareForWeb, creatCheckIn); // Create Check In
router
  .route("/searchByPhoneNumber")
  .get(authMiddlewareForWeb, searchByPhoneNumber); // search by phone no
router
  .route("/deleteCheckIn/:checkIn_Id")
  .delete(authMiddlewareForWeb, deleteCheckIn); // search by phone no
// router
//   .route("/getRecentCheckedInByUser/:userId")
//   .get(authMiddlewareForWeb, getRecentCheckedInByUser);

export default router;
