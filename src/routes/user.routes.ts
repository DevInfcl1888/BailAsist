import { Request, Response, Router } from "express";

const router = Router();

router.route("/home").get((req: Request, res: Response) => {
  console.log("this is home rouet");
  res.send("this is home route");
});
router.route("/dataSave").post(async (req: Request, res: Response) => {
  const { user } = req.body;
  console.log(user);

  return res.json({
    msg: "data submit",
    data: user,
  });
});

router.post("/dataSave");

export default router;
