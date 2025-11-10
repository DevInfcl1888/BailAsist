import {
  signUpAsBondsman,
  loginAsBondsman,
  logoutAsBondsman,
  creatCheckIn,
  searchByPhoneNumber,
  deleteCheckIn,
  addUser,
  deleteUser,
  getAllUsersOfBondsman,
  updateUserDetailsByBondsman,
  getUserCheckInStatus,
  userCheckInHistory,
  setCourtReminders,
  getCourtReminderDetails,
  cancelReminder,
} from "../controller/bondsman.controller.js";
import { Router } from "express";
import { authMiddlewareForWeb } from "../middlewares/auth.middlewares.js";

const router = Router();

// Bondsman screen
router.route("/signUpAsBondsman").post(signUpAsBondsman); // sign Up
router.route("/loginAsBondsman").post(loginAsBondsman); // login
router.route("/logoutAsBondsman").post(authMiddlewareForWeb, logoutAsBondsman); // logout
router.route("/creatCheckIn/:userId").post(authMiddlewareForWeb, creatCheckIn); // create check in
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
  .route("/getUserCheckInStatus/:userId")
  .get(authMiddlewareForWeb, getUserCheckInStatus); // get user check-in status
router
  .route("/userCheckInHistory/:userId")
  .get(authMiddlewareForWeb, userCheckInHistory); // get user check-in status
router
  .route("/setCourtReminders/:userId/:courtId")
  .post(authMiddlewareForWeb, setCourtReminders);
router
  .route("/getCourtReminderDetails/:reminderId")
  .get(authMiddlewareForWeb, getCourtReminderDetails);
router
  .route("/cancelReminder/:reminderId")
  .post(authMiddlewareForWeb, cancelReminder);

export default router;
