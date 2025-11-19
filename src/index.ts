import express, { Request, Response } from "express";
import userRouter from "./routes/user.routes.js";
import bondsmanRouter from "./routes/bondsman.routes.js";
import adminRouter from "./routes/admin.routes.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from "./db/db.js";
import "./config/firebase.js";
import "./jobs/tokenCheckJob.js";

dotenv.config();

const PORT = process.env.PORT || 8000;
const app = express();

// Middleware
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
  res.send("Server started and running successfully!");
});

// Routes
app.use("/api/v1/user", userRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/bondsman", bondsmanRouter);

// DB Connect
const startServer = async () => {
  await connectDB()
    .then(() => {
      app.listen(process.env.PORT, () => {
        console.log(`DB Connected success on ${process.env.PORT}`);
      });
    })
    .catch((err) => {
      console.log(`Error: ${err}`);
      process.exit(1);
    });
};

// sever start

startServer();
