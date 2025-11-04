import express, { Request, Response } from "express";
import router from "./routes/routes.js";
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
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));


app.get("/", (req: Request, res: Response) => {
  res.send("Server started and running successfully!");
});

// Routes
app.use("/api/v1", router);

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

export { };
