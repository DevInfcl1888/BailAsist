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
import { refreshAccessToken } from "../controller/user.controller.js";
import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middlewares.js";

const router = Router();

// Bondsman screen
router.route("/signUpAsBondsman").post(signUpAsBondsman); // sign Up
router.route("/loginAsBondsman").post(loginAsBondsman); // login
router.route("/logoutAsBondsman").post(authMiddleware, logoutAsBondsman); // logout
// router.route("/creatCheckIn/:userId").post(authMiddleware, creatCheckIn); // create check in
router.route("/searchByPhoneNumber").get(authMiddleware, searchByPhoneNumber); // search by phone no
router.route("/deleteCheckIn/:checkIn_Id").post(authMiddleware, deleteCheckIn); // delete check in
router.route("/deleteUser/:userId").delete(authMiddleware, deleteUser); // delete user from bondsman
router
  .route("/getAllUsersOfBondsman")
  .get(authMiddleware, getAllUsersOfBondsman); // get all users of bondsman
router.route("/addUser/:userId").post(authMiddleware, addUser); // add user to bondsman
router
  .route("/updateUserDetailsByBondsman/:userId")
  .put(authMiddleware, updateUserDetailsByBondsman); // update user details by bondsman
router
  .route("/setCourtReminders/:userId/:courtId")
  .post(authMiddleware, setCourtReminders);
router
  .route("/getCourtReminderDetails/:reminderId")
  .get(authMiddleware, getCourtReminderDetails);
router
  .route("/cancelReminder/:reminderId")
  .post(authMiddleware, cancelReminder);
router.route("/getAd").get(authMiddleware, getAd);
router
  .route("/deleteReminder/:reminderId")
  .post(authMiddleware, deleteReminder);
router
  .route("/deleteBondsmanProfile/:id")
  .delete(authMiddleware, deleteBondsmanProfile);
router.route("/refreshAccessToken").post(refreshAccessToken);

export default router;
