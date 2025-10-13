import express from "express";
import userRoute from "../src/routes/user.routes.js";
import cookieParser from "cookie-parser";

const app = express();
app.use(express.json());

app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use("/api/user", userRoute);

export default app;
