import express, { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  isValidEmail,
  isValidPassword,
  isValidTag,
} from "../utils/dataValidators.js";
import { User } from "../models/user.model.js";

const registration = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    surname,
    streetName,
    homeAddress,
    workPlace,
    workPlaceAddress,
    vehicalInfo,
    vehicalColor,
    tags,
    partnerAddress,
    isAgreed,
    email,
    phoneNo,
    password,
  } = req.body;

  // Data validation

  if (
    !name?.trim() ||
    !surname?.trim() ||
    !Array.isArray(tags) ||
    !streetName||
    !homeAddress||
    !workPlace||
    !workPlaceAddress||
    !vehicalColor||
    
    tags.length === 0 ||
    !vehicalInfo ||
    Object.keys(vehicalInfo).length === 0 ||
    !isAgreed ||
    !email?.trim() ||
    !phoneNo?.trim() ||
    !password?.trim()
  ) {
    res.status(400).json({ msg: "All credentials are required" });
  }
  if (!isValidPassword(password))
    return res.status(401).json({
      message:
        "Password must contain at least 1 uppercase, lowercase, number, and special character, and password should be upto 6 characters long",
    });
  if (phoneNo.length !== 10 || !/^\d{10}$/.test(phoneNo)) {
    res.status(404).json({ message: "Invalid phone no." });
  }
  if (!isValidEmail(email)) {
    res.status(404).json({ message: "Invalid email" });
  }
  if (!isValidTag(tags)) res.status(404).json({ message: "Invalid email" });
  const checkUserExistence = await User.findOne({
    $or: [
      {
        email: email,
      },
      {
        name: name,
      },
    ],
  });

  if (checkUserExistence)
    return res.status(403).json({ message: "User already exist" });

  // User created
  const createdUser = await User.create({
    name,
    surname,
    email,
    phoneNo,
    password,
    streetName,
    homeAddress,
    workPlace,
    workPlaceAddress,
    vehicalInfo,
    vehicalColor,
    tags,
    partnerAddress,
    isAgreed,
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
  if (!isValidPassword(password))
    return res.status(401).json({ message: "Invalid password" });

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

const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  const user = await User.findById(req.user?._id);

  if (!user)
    return res.status(404).json({ message: "User not found or maybe logout" });

  const isMatchPassword = await user.isCorrectPassword(oldPassword);
  if (!isMatchPassword)
    return res.status(401).json({ message: "Old password mismatch" });
  if (!isValidPassword(newPassword))
    return res.status(401).json({ message: "Invalid password" });
  if (newPassword !== confirmPassword)
    return res
      .status(401)
      .json({ message: "New and old password must be same" });
  if (newPassword === oldPassword)
    return res.status(401).json({ message: "Password has no change" });

  // update password in DB
  user.password = newPassword;
  const updatedUserPassword = await user.save({ validateBeforeSave: false });

  if (!updatedUserPassword)
    return res.status(401).json({
      message:
        "Internal Server error so password is not changed. try again !..",
    });
  return res
    .status(200)
    .clearCookie("accessToken", { httpOnly: true, secure: true })
    .clearCookie("refreshToken", { httpOnly: true, secure: true })
    .json({ message: "Password changed successfully, please login again" });
});

const updateUserDetails = asyncHandler(async (req: Request, res: Response) => {
  const { name, email } = req.body;
  const user = await User.findById(req.user?._id);
  if (!user)
    return res.status(404).json({ message: "User not found or maybe logout" });
  if (!email || !isValidEmail(email)) {
    res.status(404).json({ message: "Invalid email" });
  }
  if (name) user.name = name;
  if (email) user.email = email;
  const updatedUser = await user.save({ validateBeforeSave: false });
  if (!updatedUser)
    return res.status(401).json({
      message:
        "Internal Server error so details are not updated. try again !..",
    });
  return res
    .status(200)
    .json({ message: "Details updated successfully", updatedUser });
});

const getUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?._id).select(
    "-password -refreshToken"
  );
  if (!user)
    return res
      .status(404)
      .json({ message: "User not foundor maybe you logout" });
  return res.status(200).json({
    message: "User Profile",
    user,
  });
});
const getdata = async (req: Request, res: Response) => {
  if (req.user?._id) {
    return res.status(200).json({ msg: "user still login" });
  }
  return res.status(401).json({ msg: "user not login" });
};
export { registration, login, logout, changePassword, getUserProfile, getdata };
