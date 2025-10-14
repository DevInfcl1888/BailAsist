import { Router } from "express";
import {
  registration,
  login,
  logout,
  getdata,
} from "../controller/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middlewares.js";

const router = Router();

router.route("/regitration").post(registration);
router.route("/login").post(login);
router.route("/logout").post(logout);
router.route("/getdata").get(authMiddleware, getdata);

export default router;
