import { Router } from "express";
const router = Router();


import { registration} from "../controller/user.controller.js";

router.route("/regitration").post(registration);


export default router;
