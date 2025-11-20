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
  getUserBondsmanInfo,
  createOrUpdateCheckIn,
  updateAddressAndSendPictureAsProof,
  updateLatAndLong,
  getResidenceInfo,
  getContactInfo,
  getLegalInfo,
  getPersonalInfo,
  getDriverLicInfo,
  getPersonalRefrenceInfo,
  getEmployementStatus,
  getUserCheckInStatus,
  checkOut,
  userCheckInHistory,
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
router.route("/logout").post(authMiddleware, logout); // logout
router.route("/changePassword").patch(authMiddleware, changePassword); // change password
router.route("/resetPassword").patch(resetPassword); // reset password
router.route("/getUserProfile").get(authMiddleware, getUserProfile); // get user profile
router.route("/updateUserDetails").patch(authMiddleware, updateUserDetails); // update user details
router.route("/sendOTP").post(otpLimiter, sendOTP); // send OTP
router.route("/verifyOTP").post(verifyOTP); // verify OTP
router.route("/deleteUserProfile").delete(authMiddleware, deleteUserProfile); // delete user profile
router.route("/getdata").get(authMiddleware, getdata); // This is only for checking that user still logged in or not
router.route("/addResidenceInfo").post(authMiddleware, addResidenceInfo); // add residence info
router.route("/getResidenceInfo").get(authMiddleware, getResidenceInfo); // get residence info
router.route("/addContactInfo").post(authMiddleware, addContactInfo); // add contact info
router.route("/getContactInfo").get(authMiddleware, getContactInfo); // get contact info
router.route("/addLegalInfo").post(authMiddleware, addLegalInfo); // add legal info
router.route("/getLegalInfo").get(authMiddleware, getLegalInfo); // get legal info
router.route("/addPersonalInfo").post(authMiddleware, addPersonalInfo); // add personal info
router.route("/getPersonalInfo").get(authMiddleware, getPersonalInfo); // get personal info
router.route("/addDriverLicInfo").post(authMiddleware, addDriverLicInfo); // add driver license info
router.route("/getDriverLicInfo").get(authMiddleware, getDriverLicInfo); // get driver license info
router.route("/bondsman").get(authMiddleware, getUserBondsmanInfo); // get user's bondsman info
router
  .route("/createOrUpdateCheckIn")
  .post(authMiddleware, upload.single("photoUrl"), createOrUpdateCheckIn);
  
router
  .route("/checkOut")
  .post(authMiddleware, upload.single("photoUrl"), checkOut); // check-out with image upload

router.route("/getUserCheckInStatus").get(authMiddleware, getUserCheckInStatus); // check-in with image upload

router
  .route("/addPersonalRefrenceInfo")
  .post(authMiddleware, addPersonalRefrenceInfo); // add personal reference info
router
  .route("/getPersonalRefrenceInfo")
  .get(authMiddleware, getPersonalRefrenceInfo); // get personal reference info
router
  .route("/addEmployementStatus")
  .post(authMiddleware, addEmployementStatus); // add employement status
router.route("/getEmployementStatus").get(authMiddleware, getEmployementStatus); // get employement status
router
  .route("/updateAddressAndSendPictureAsProof")
  .post(
    authMiddleware,
    upload.single("image"),
    updateAddressAndSendPictureAsProof
  ); // update address and send picture as proof
router.route("/updateLatAndLong").post(authMiddleware, updateLatAndLong); // update latitude and longitude

router.route("/userCheckInHistory").get(authMiddleware, userCheckInHistory);

// Home Screen Routes
router.route("/createCourt").post(authMiddleware, createCourt); // create court
router.route("/getCourtDetails/:courtId").get(authMiddleware, getCourtDetails); // get court details by id

export default router;
