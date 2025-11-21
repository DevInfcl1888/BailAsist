import {
  adminSignUp,
  adminLogin,
  adminLogout,
  adminLoginAsBondsman,
  adminLogoutAsBondsman,
  uploadAds,
  getAllAds,
  deleteAd,
  createNewBondsman,
  removeBondsman,
  addNewBondsman,
  listAllActiveBondsman,
  getBondsmanDetails,
  getTotalBondsmanCount,
  getTotalUsersCount,
  verifyToken,
  getAllUsers,
  deleteUserProfile,
} from "../controller/admin.controller.js";
import { Router } from "express";
import { authMiddlewareForWeb } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";

const router = Router();

// Admin routes
router.route("/adminSignUp").post(adminSignUp); // Admin Sign Up
router.route("/adminLogin").post(adminLogin); // Admin Login
router.route("/adminLogout").post(authMiddlewareForWeb, adminLogout); // Admin Logout
router
  .route("/createNewBondsman")
  .post(authMiddlewareForWeb, createNewBondsman); // signup Bondsman via admin
router
  .route("/adminLoginAsBondsman/:bondsmanId")
  .post(authMiddlewareForWeb, adminLoginAsBondsman); // admin Login As Bondsman Login
router
  .route("/adminLogoutAsBondsman")
  .post(authMiddlewareForWeb, adminLogoutAsBondsman); // admin logout As Bondsman Login
router
  .route("/uploadAds")
  .post(authMiddlewareForWeb, upload.single("adImg"), uploadAds); // upload ads
router.route("/getAllAds").get(authMiddlewareForWeb, getAllAds); // get all ads
router.route("/deleteAd/:adId").post(authMiddlewareForWeb, deleteAd); // delete ads
router
  .route("/removeBondsman/:bondsmanId")
  .post(authMiddlewareForWeb, removeBondsman); // remove bondsman
router
  .route("/addNewBondsman/:bondsmanId")
  .post(authMiddlewareForWeb, addNewBondsman); // add bondsman
router
  .route("/listAllActiveBondsman")
  .get(authMiddlewareForWeb, listAllActiveBondsman); // list all active bondsman
router
  .route("/getBondsmanDetails")
  .get(authMiddlewareForWeb, getBondsmanDetails); // get All Bondsman bondsman
router
  .route("/getTotalBondsmanCount")
  .get(authMiddlewareForWeb, getTotalBondsmanCount); // get All Bondsman count bondsman
router
  .route("/getTotalUsersCount")
  .get(authMiddlewareForWeb, getTotalUsersCount); // get All User count bondsman
router
  .route("/deleteUserProfile/:id")
  .delete(authMiddlewareForWeb, deleteUserProfile); // delete user profile

// router.get("/verifyToken", authMiddlewareForWeb,
router.route("/verifyToken").get(authMiddlewareForWeb, verifyToken);
router.route("/getAllUsers").get(authMiddlewareForWeb, getAllUsers);

export default router;
