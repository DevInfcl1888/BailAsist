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
  deleteBondsmanProfile,
  updateBondsmanDetails,
  updateUserDetails,
  createContactUs,
  getContactUs,
  createPrivacyPolicy,
  getPrivacyPolicy,
} from "../controller/admin.controller.js";
import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";

const router = Router();

// Admin routes
router.route("/adminSignUp").post(adminSignUp); // Admin Sign Up
router.route("/adminLogin").post(adminLogin); // Admin Login
router.route("/adminLogout").post(authMiddleware, adminLogout); // Admin Logout
router.route("/createNewBondsman").post(authMiddleware, createNewBondsman); // signup Bondsman via admin
router
  .route("/adminLoginAsBondsman/:bondsmanId")
  .post(authMiddleware, adminLoginAsBondsman); // admin Login As Bondsman Login
router
  .route("/adminLogoutAsBondsman")
  .post(authMiddleware, adminLogoutAsBondsman); // admin logout As Bondsman Login
router
  .route("/uploadAds")
  .post(authMiddleware, upload.single("adImg"), uploadAds); // upload ads
router.route("/getAllAds").get(authMiddleware, getAllAds); // get all ads
router.route("/deleteAd/:adId").post(authMiddleware, deleteAd); // delete ads
router
  .route("/removeBondsman/:bondsmanId")
  .post(authMiddleware, removeBondsman); // remove bondsman
router
  .route("/addNewBondsman/:bondsmanId")
  .post(authMiddleware, addNewBondsman); // add bondsman
router
  .route("/updateBondsmanDetails/:bondsmanId")
  .post(authMiddleware, updateBondsmanDetails); // add bondsman
router
  .route("/listAllActiveBondsman")
  .get(authMiddleware, listAllActiveBondsman); // list all active bondsman
router.route("/getBondsmanDetails").get(authMiddleware, getBondsmanDetails); // get All Bondsman bondsman
router
  .route("/getTotalBondsmanCount")
  .get(authMiddleware, getTotalBondsmanCount); // get All Bondsman count bondsman
router.route("/getTotalUsersCount").get(authMiddleware, getTotalUsersCount); // get All User count bondsman
router
  .route("/deleteUserProfile/:id")
  .delete(authMiddleware, deleteUserProfile); // delete user profile
router
  .route("/updateUserDetails/:userId")
  .post(authMiddleware, updateUserDetails); // update user details
router
  .route("/deleteBondsmanProfile/:id")
  .delete(authMiddleware, deleteBondsmanProfile); // delete user profile

// router.get("/verifyToken", authMiddleware,
router.route("/verifyToken").get(authMiddleware, verifyToken);
router.route("/getAllUsers").get(authMiddleware, getAllUsers);

// Contact Us routes
router.route("/contactUs").post(authMiddleware, createContactUs); // create/update contact us
router.route("/contactUs").get(getContactUs); // get contact us (public)

// Privacy Policy routes
router.route("/privacyPolicy").post(authMiddleware, createPrivacyPolicy); // create/update privacy policy
router.route("/privacyPolicy").get(getPrivacyPolicy); // get privacy policy (public)

export default router;
