import { Admin } from "../models/admin.model.js";
import express, { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  isValidData,
  isValidEmail,
  isValidPassword,
  isValidPhone,
} from "../utils/dataValidators.js";
import { Bondsman } from "../models/bondsman.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const adminSignUp = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, phoneNo, password } = req.body as {
    username: string;
    email: string;
    phoneNo: string;
    password: string;
  };
  const isAdmin = await Admin.find({ role: "admin" });

  if (isAdmin.length !== 0)
    return res.status(403).json({ message: "Admin already exist" });

  if (!username.trim() || !email.trim() || !phoneNo.trim() || !password.trim())
    return res.status(404).json({ message: "All fields are required" });
  if (!isValidData(username))
    return res.status(401).json({ message: "Invalid username." });
  if (!isValidEmail(email))
    return res.status(401).json({ message: "Invalid email" });
  if (!isValidPhone(phoneNo))
    return res.status(401).json({ message: "Invalid phone" });
  if (!isValidPassword(password))
    return res.status(401).json({
      message:
        "Password must contain at least 1 uppercase, lowercase, number, and special character, and password should be upto 8 characters long",
    });
  const normalizedEmail = email.toLowerCase();
  const admin = await Admin.create({
    username,
    email: normalizedEmail,
    phoneNo,
    password,
  });
  if (!admin)
    return res.status(500).json({ message: "Internal server error occur" });
  const refreshToken = admin.generateRefreshToken();
  const accessToken = admin.generateAccessToken();
  admin.refreshToken = refreshToken;
  await admin.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json({ message: "Admin signUp", admin, accessToken: accessToken });
});

const adminLogin = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body as {
    username: string;
    password: string;
  };
  const isAdminExist = await Admin.find({ role: "admin" });
  if (isAdminExist.length === 0)
    return res.status(400).json({ message: "Admin not exist" });

  if (!isValidData(username))
    return res.status(401).json({ message: "Invalid username" });
  const isMatch = await isAdminExist[0].isCorrectPassword(password);
  if (!isMatch) return res.status(401).json({ message: "Invalid password" });

  const accessToken = isAdminExist[0].generateAccessToken();
  const refreshToken = isAdminExist[0].generateRefreshToken();

  return res
    .status(200)
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      maxAge: 15 * 60 * 1000,
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      maxAge: 15 * 24 * 60 * 60 * 1000,
    })
    .json({
      message: "Admin logged-in",
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
});

const adminLoginAsBondsman = asyncHandler(
  async (req: Request, res: Response) => {
    const { bondsmanId } = req.params;
    const isAdmin = await Admin.findById(req.user?._id);
    if (!isAdmin)
      return res
        .status(403)
        .json({ message: "only admin can allow this route" });
    const isBondsmanExist = await Bondsman.findById(bondsmanId);
    if (!isBondsmanExist)
      return res.status(404).json({ message: "Bondsman not found" });
    const accessToken = isBondsmanExist.generateAccessToken();
    const refreshToken = isBondsmanExist.generateRefreshToken();

    return res
      .status(200)
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: true,
        maxAge: 15 * 60 * 1000,
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        maxAge: 15 * 24 * 60 * 60 * 1000,
      })
      .json({
        message: "Admin is logged in as bondsman",
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
  }
);

const adminLogoutAsBondsman = asyncHandler(
  async (req: Request, res: Response) => {
    await Bondsman.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          refreshToken: "",
        },
      },
      {
        new: true,
      }
    );
    const opt = {
      httpOnly: true,
      secure: true,
    };
    return res
      .status(200)
      .clearCookie("accessToken", opt)
      .clearCookie("refreshToken", opt)
      .json({ message: "Admin is logged out as bondsman" });
  }
);

const uploadAds = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await Admin.findById(req.user?._id);
  if (!isAdmin) return res.status(400).json({ message: "Only admin allow" });
  if (!req.file?.buffer)
    return res.status(404).json({ message: "Image not found for uploading" });

  const uploadAd = await uploadToCloudinary(req.file?.buffer);
  if (!uploadAd)
    return res
      .status(401)
      .json({ message: "Error occur during uploading image" });
  const saveToDB = await Admin.findByIdAndUpdate(
    isAdmin?._id,
    {
      $set: {
        adImg: uploadAd.secure_url,
      },
    },
    {
      new: true,
    }
  ).select("adImg createdAt updatedAt username");
  return res.status(200).json({ message: "Ad uploaded", saveToDB });
});

export {
  adminSignUp,
  adminLogin,
  adminLoginAsBondsman,
  adminLogoutAsBondsman,
  uploadAds,
};
