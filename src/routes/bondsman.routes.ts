import {
  signUpAsBondsman,
  loginAsBondsman,
  logoutAsBondsman,
  searchByPhoneNumber,
  deleteCheckIn,
  addUser,
  deleteUser,
  getAllUsersOfBondsman,
  updateUserDetailsByBondsman,
  deleteBondsmanProfile,
  setCourtReminders,
  getCourtReminderDetails,
  cancelReminder,
  getAd,
  deleteReminder,
} from "../controller/bondsman.controller.js";
import { Router } from "express";
import { authMiddlewareForWeb } from "../middlewares/auth.middlewares.js";

const router = Router();

// Bondsman screen
router.route("/signUpAsBondsman").post(signUpAsBondsman); // sign Up
router.route("/loginAsBondsman").post(loginAsBondsman); // login
router.route("/logoutAsBondsman").post(authMiddlewareForWeb, logoutAsBondsman); // logout
// router.route("/creatCheckIn/:userId").post(authMiddlewareForWeb, creatCheckIn); // create check in
router
  .route("/searchByPhoneNumber")
  .get(authMiddlewareForWeb, searchByPhoneNumber); // search by phone no
router
  .route("/deleteCheckIn/:checkIn_Id")
  .post(authMiddlewareForWeb, deleteCheckIn); // delete check in
router.route("/deleteUser/:userId").delete(authMiddlewareForWeb, deleteUser); // delete user from bondsman
router
  .route("/getAllUsersOfBondsman")
  .get(authMiddlewareForWeb, getAllUsersOfBondsman); // get all users of bondsman
router.route("/addUser/:userId").post(authMiddlewareForWeb, addUser); // add user to bondsman
router
  .route("/updateUserDetailsByBondsman/:userId")
  .post(authMiddlewareForWeb, updateUserDetailsByBondsman); // update user details by bondsman
router
  .route("/setCourtReminders/:userId/:courtId")
  .post(authMiddlewareForWeb, setCourtReminders);
router
  .route("/getCourtReminderDetails/:reminderId")
  .get(authMiddlewareForWeb, getCourtReminderDetails);
router
  .route("/cancelReminder/:reminderId")
  .post(authMiddlewareForWeb, cancelReminder);
router.route("/getAd").get(authMiddlewareForWeb, getAd);
router
  .route("/deleteReminder/:reminderId")
  .post(authMiddlewareForWeb, deleteReminder);
router
  .route("/deleteBondsmanProfile/:id")
  .delete(authMiddlewareForWeb, deleteBondsmanProfile);

export default router;
