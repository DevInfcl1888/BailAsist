import express, { Request, Response } from "express";
import userRouter from "./routes/user.routes";
import bondsmanRouter from "./routes/bondsman.routes";
import adminRouter from "./routes/admin.routes";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import "./config/firebase.js";
import "./jobs/tokenCheckJob.js";

dotenv.config();

export const app = express();

// middleware
app.use(
  cors({
    origin: [
      "https://assistt.duckdns.org",
      "http://localhost:5172",
      "http://localhost:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
  res.send("Server started!");
});

// routes
app.use("/api/v1/user", userRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/bondsman", bondsmanRouter);

export default app;
