import express, { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isValidEmail } from "../utils/emailValidator.js";
import { User } from "../models/user.model.js";

const registration = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, phoneNo, password } = req.body;
  if (!name || !email || !phoneNo || !password) {
    res.status(404).json({ msg: "All credentials are required" });
  }

  if (!isValidEmail(email)) {
    res.status(404).json({ message: "Invalid email" });
  }

  const createdUser = await User.create({
    name: name,
    email,
    phoneNo,
    password,
  });

  const isUserRegisteredSuccessFully = await User.findById(
    createdUser?._id
  ).select("-refreshToken -password");

  if (!isUserRegisteredSuccessFully)
    res.status(400).json({ message: "Internal server error during registration" });

  return res.status(200).json({
    isUserRegisteredSuccessFully,
    message: "User registred successfully",
  });
});

export { registration };
