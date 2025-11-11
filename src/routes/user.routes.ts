import { Router } from "express";
import {
  authMiddleware,
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
  getCheckInStatus,
  getUserBondsmanInfo,
  checkIn,
  updateAddressAndSendPictureAsProof,
  updateLatAndLong,
} from "../controller/user.controller.js";

// Home Screen Import
import {
  createCourt,
  getCourtDetails,
} from "../controller/homeScreen.controller.js";


const router = Router();

// User Routes
router.route("/registration").post(registration); // registration
router.route("/login").post(login); // login
router.route("/logout").post(logout); // logout
router.route("/changePassword").patch(authMiddleware, changePassword); // change password
router.route("/resetPassword").patch(resetPassword); // reset password
router.route("/getUserProfile").get(authMiddleware, getUserProfile); // get user profile
router.route("/updateUserDetails").patch(authMiddleware, updateUserDetails); // update user details
router.route("/sendOTP").post(otpLimiter, sendOTP); // send OTP
router.route("/verifyOTP").post(verifyOTP); // verify OTP
router.route("/deleteUserProfile").delete(authMiddleware, deleteUserProfile); // delete user profile
router.route("/getdata").get(authMiddleware, getdata); // get user data
router.route("/addResidenceInfo").post(authMiddleware, addResidenceInfo); // add residence info
router.route("/addContactInfo").post(authMiddleware, addContactInfo); // add contact info
router.route("/addLegalInfo").post(authMiddleware, addLegalInfo); // add legal info
router.route("/addPersonalInfo").post(authMiddleware, addPersonalInfo); // add personal info
router.route("/addDriverLicInfo").post(authMiddleware, addDriverLicInfo); // add driver license info
router.route("/getCheckInStatus").get(authMiddleware, getCheckInStatus); // get check-in status
router.route("/bondsman/:userId").get(authMiddleware, getUserBondsmanInfo); // get user's bondsman info
router
  .route("/checkIn/:checkIn_Id")
  .post(authMiddleware, upload.single("image"), checkIn); // check-in with image upload
router
  .route("/addPersonalRefrenceInfo")
  .post(authMiddleware, addPersonalRefrenceInfo); // add personal reference info
router
  .route("/addEmployementStatus")
  .post(authMiddleware, addEmployementStatus); // add employement status
router
  .route("/updateAddressAndSendPictureAsProof")
  .post(
    authMiddleware,
    upload.single("image"),
    updateAddressAndSendPictureAsProof
  ); // update address and send picture as proof
router.route("/updateLatAndLong").post(authMiddleware, updateLatAndLong); // update latitude and longitude

// Home Screen Routes
router.route("/createCourt").post(authMiddleware, createCourt); // create court
router.route("/getCourtDetails/:courtId").get(authMiddleware, getCourtDetails); // get court details by id

export default router;
