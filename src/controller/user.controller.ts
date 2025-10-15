import express, { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  isValidEmail,
  isValidPassword,
  isValidTag,
} from "../utils/dataValidators.js";
import { User } from "../models/user.model.js";
import { generateOTP, sendOTPfun, otpStore } from "../utils/OTPsender.js";
import bcrypt from "bcryptjs";

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
    email,
    password,
    phoneNo,
    isAgreed,
  } = req.body as {
    name: string;
    surname: string;
    streetName: string;
    homeAddress: string;
    workPlace: string;
    workPlaceAddress: string;
    vehicalInfo: { model: string; vehicalNumber: string }[];
    vehicalColor: string;
    tags: string[];
    partnerAddress: string;
    email: string;
    password: string;
    phoneNo: string;
    isAgreed: boolean;
  };

  // Data validation

  if (
    !name?.trim() ||
    !surname?.trim() ||
    !Array.isArray(tags) ||
    !streetName ||
    !homeAddress ||
    !workPlace ||
    !workPlaceAddress ||
    !vehicalColor ||
    tags.length === 0 ||
    !partnerAddress ||
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
    console.log("k", isValidEmail(email));
    return res.status(404).json({ message: "Invalid email" });
  }
  if (!isValidTag(tags))
    return res.status(404).json({ message: "Invalid tag" });
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
    return res
      .status(400)
      .json({ message: "Internal server error during registration" });

  return res.status(200).json({
    message: "User registred successfully",
    isUserRegisteredSuccessFully,
  });
});

const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

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
  // remove refresh token from DB
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );
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
  const { oldPassword, newPassword, confirmPassword } = req.body as {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
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
    email,
    phoneNo,
  } = req.body as {
    name: string;
    surname: string;
    streetName: string;
    homeAddress: string;
    workPlace: string;
    workPlaceAddress: string;
    vehicalInfo: { model: string; vehicalNumber: string }[];
    vehicalColor: string;
    tags: string[];
    partnerAddress: string;
    email: string;
    phoneNo: string;
  };

  // Data validation

  if (
    !name?.trim() ||
    !surname?.trim() ||
    !Array.isArray(tags) ||
    !streetName ||
    !homeAddress ||
    !workPlace ||
    !workPlaceAddress ||
    !vehicalColor ||
    tags.length === 0 ||
    !vehicalInfo ||
    !partnerAddress ||
    Object.keys(vehicalInfo).length === 0 ||
    !email?.trim() ||
    !phoneNo?.trim()
  ) {
    return res.status(400).json({ msg: "All credentials are required" });
  }
  if (phoneNo.length !== 10 || !/^\d{10}$/.test(phoneNo)) {
    return res.status(404).json({ message: "Invalid phone no." });
  }
  if (!isValidEmail(email)) {
    return res.status(404).json({ message: "Invalid email" });
  }
  if (!isValidTag(tags))
    return res.status(404).json({ message: "Invalid tags" });
  if (email !== req.user?.email) {
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(403).json({ message: "Email already in use" });
    }
  }
  const user = await User.findById(req.user?._id);
  if (!user)
    return res
      .status(404)
      .json({ message: "User not found or maybe you logout" });
  let data = {
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
    email,
    phoneNo,
  };

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: data },
    {
      new: true,
    }
  );

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

const sendOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  // email existence check
  if (!email || !isValidEmail(email))
    return res.status(401).json({ message: "Inavlid email" });
  // generate OTP
  const generate_OTP: string = await generateOTP(email);
  console.log("generate_OTP", generate_OTP);

  const send_OTP: string = await sendOTPfun(email, generate_OTP);
  console.log("send_OTP", send_OTP);

  return res.status(200).json({
    message: `OTP send successfully to your registered email : ${email}`,
  });
});

const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return res.status(400).json({ message: "Missing fields" });

  const stored = otpStore.get(email);
  if (!stored)
    return res.status(400).json({ message: "OTP not found or expired" });
  console.log("stored", stored);

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ message: "OTP expired" });
  }

  const isMatch = await bcrypt.compare(otp, stored.hash);
  if (!isMatch) return res.status(400).json({ message: "Invalid OTP" });

  // success
  otpStore.delete(email);
  return res.status(200).json({ message: "OTP verified successfully ✅" });
});

const getdata = async (req: Request, res: Response) => {
  if (req.user?._id) {
    return res.status(200).json({ msg: "user still login" });
  }
  return res.status(401).json({ msg: "user not login" });
};

const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, newPassword, confirmPassword } = req.body as {
    email: string;
    newPassword: string;
    confirmPassword: string;
  };
  const user = await User.findOne({ email: email });

  if (!user)
    return res.status(404).json({ message: "User not found or maybe logout" });
  if (!isValidPassword(newPassword))
    return res.status(401).json({ message: "Invalid password" });
  if (newPassword !== confirmPassword)
    return res
      .status(401)
      .json({ message: "New and old password must be same" });

  // update password in DB
  user.password = newPassword;
  // user.password = newPassword;
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
    .json({ message: "Password changed successfully, please try to login again" });
});

const deleteUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const deletedUserInfo = await User.deleteOne({ _id: req.user?._id });

  if (deletedUserInfo.deletedCount !== 1)
    return res
      .status(401)
      .json({ message: "User profile can't be deleted", deletedUserInfo });
  return res
    .status(200)
    .json({ message: "User profile deleted", deletedUserInfo });
});
export {
  registration,
  login,
  logout,
  changePassword,
  getUserProfile,
  updateUserDetails,
  getdata,
  deleteUserProfile,
  sendOTP,
  resetPassword,
  verifyOTP,
};
