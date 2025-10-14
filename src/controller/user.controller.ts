import express, { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isValidEmail } from "../utils/emailValidator.js";
import { User } from "../models/user.model.js";

const registration = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, phoneNo, password } = req.body;

  // Data validation
  if (!name || !email || !phoneNo || !password) {
    res.status(404).json({ msg: "All credentials are required" });
  }
  if (phoneNo.length !== 10) {
    res.status(404).json({ message: "Invalid phone no." });
  }
  if (!isValidEmail(email)) {
    res.status(404).json({ message: "Invalid email" });
  }
  
  const checkUserExistence = await User.findOne({
    $or: [{ email: email }, { name: name }],
  });  

  if (checkUserExistence)
    return res.status(403).json({ message: "User already exist" });

  // User created
  const createdUser = await User.create({
    name: name,
    email,
    phoneNo,
    password,
  });

  // check user existence
  const isUserRegisteredSuccessFully = await User.findById(
    createdUser?._id
  ).select("-refreshToken -password");

  if (!isUserRegisteredSuccessFully)
    res
      .status(400)
      .json({ message: "Internal server error during registration" });

  return res.status(200).json({
    message: "User registred successfully",
    isUserRegisteredSuccessFully,
  });
});

const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Data validation
  if (!email || !password)
    return res.status(401).json({ message: "Credentials are missing" });
  if (!isValidEmail(email)) {
    res.status(404).json({ message: "Invalid email" });
  }

  // check user existence
  const user = await User.findOne({ email });
  if (!user)
    return res
      .status(404)
      .json({ message: "User not found with these credentials" });

  // generate accessToken and refreshToken
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  // check password
  const isMatchPassword = await user.isCorrectPassword(password);
  if (!isMatchPassword)
    return res.status(401).json({ message: "Invalid password" });

  // sending response
  return res
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      maxAge: 15 * 60 * 1000, // 15 min
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })
    .status(200)
    .json({
      message: "User login successfully",
      user: user.name,
      email: user.email,
    });
});

const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies;

  // extract refresh token from cookies
  if (!refreshToken)
    return res.status(404).json({ message: "No refresh token found" });

  // check user existence
  const user = await User.findOne({ refreshToken: refreshToken });
  if (user) {
    // remove refreshToken from DB and save
    user.refreshToken = "";
    await user.save({ validateBeforeSave: false });
  }
  // sending the response and remove refreshToken and accessToken from DB and cookies.
  return res
    .clearCookie("accessToken", { httpOnly: true, secure: true })
    .clearCookie("refreshToken", { httpOnly: true, secure: true })
    .status(200)
    .json({
      message: "User logout successfully",
    });
});



const getdata = async (req: Request, res: Response) => {
  if (req.user?._id) {
    return res.status(200).json({ msg: "user still login" });
  }
  return res.status(401).json({ msg: "user not login" });
};
export { registration, login, logout, getdata };
