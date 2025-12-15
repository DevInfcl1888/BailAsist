import { DecodeToken } from "./../middlewares/auth.middlewares";
import express, { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  isDateValid,
  isValidData,
  isValidEmail,
  isValidPassword,
} from "../utils/dataValidators.js";
import {
  ResidenceInfo,
  LegalInfo,
  User,
  PersonalInfo,
  DriversLicInfo,
  personalRefrenceInfo,
  EmployementInfo,
  CheckIn,
  CheckOut,
} from "../models/user.model.js";
import { Bondsman, Court, Reminder } from "../models/bondsman.model.js";
import { generateOTP, sendOTPfun, otpStore } from "../utils/OTPsender.js";
import bcrypt from "bcryptjs";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import Blacklist from "../models/blacklist.model.js";
import { ReminderNotification } from "../models/notification.model.js";
import mongoose, { mongo } from "mongoose";
import { PipelineStage } from "mongoose";

const refreshAccessToken = async (req: Request, res: Response) => {
  const incomingRefreshToken = req.body.refreshToken;

  if (!incomingRefreshToken) {
    return res.status(400).json({ message: "Refresh token required" });
  }

  let decoded: DecodeToken;
  try {
    // ⚠️ jwt.verify() checks for expiration automatically
    decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_KEY
    ) as DecodeToken;
  } catch (error) {
    // This catches JWT errors (e.g., TokenExpiredError, JsonWebTokenError)
    console.error("JWT Verification Failed:", error.message);

    // Send 401 Unauthorized for invalid or expired tokens
    return res
      .status(401)
      .json({ message: "Invalid or expired refresh token" });
  }

  // After successful verification:
  const user = await User.findById(decoded._id);

  if (!user || user.refreshToken !== incomingRefreshToken) {
    // Token is valid but might be stolen/reused, or user deleted
    return res
      .status(401)
      .json({ message: "Invalid refresh token or user not found" });
  }

  const newAccessToken = user.generateAccessToken();

  return res.status(200).json({
    refreshToken: incomingRefreshToken,
    accessToken: newAccessToken,
  });
};

const registration = asyncHandler(async (req: Request, res: Response) => {
  const {
    firstName,
    middleName,
    lastName,
    email,
    password,
    confirmPassword,
    phoneNo,
    homeAddress,
    street,
    deviceToken,
    ZipCode,
    isAgreed,
    countryCode,
  } = req.body as {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    phoneNo: string;
    deviceToken?: string;
    homeAddress: string;
    street: string;
    ZipCode: string;
    isAgreed: boolean;
    countryCode: string;
  };
  // Data validation
  if (
    !firstName?.trim() ||
    !lastName?.trim() ||
    !email?.trim() ||
    !password?.trim() ||
    !confirmPassword?.trim() ||
    !phoneNo?.trim() ||
    !homeAddress?.trim() ||
    !street?.trim() ||
    !ZipCode?.trim() ||
    !countryCode?.trim() ||
    isAgreed === false
  ) {
    return res.status(400).json({ message: "All credentials are required" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Invalid email" });
  }
  if (!isValidPassword(password) || !isValidPassword(confirmPassword))
    return res.status(400).json({
      message:
        "Password must contain at least 1 uppercase, lowercase, number, and special character, and password should be upto 8 characters long",
    });
  if (homeAddress.length < 10 || homeAddress.length > 100)
    return res.status(400).json({
      message: "Home address must be between 10 and 100 characters long.",
    });
  if (street.length > 100 || ZipCode.length > 11)
    return res.status(400).json({ message: "Street or ZIP code is too long" });
  if (password !== confirmPassword)
    return res
      .status(400)
      .json({ message: "Confirm password should be same as password" });
  const normalizedEmail = email.toLowerCase();
  const checkUserExistence = await User.findOne({
    email: normalizedEmail,
  });

  if (checkUserExistence)
    return res.status(403).json({ message: "User already exist" });

  // User created
  const createdUser = await User.create({
    firstName,
    middleName: middleName ? middleName : "",
    lastName,
    email: normalizedEmail,
    password,
    phoneNo,
    countryCode,
    deviceToken: deviceToken ? deviceToken : "",
    homeAddress,
    street,
    ZipCode,
    isAgreed,
  });

  // check user existence
  const isUserRegisteredSuccessFully = await User.findById(
    createdUser?._id
  ).select("-password -refreshToken");

  if (!isUserRegisteredSuccessFully)
    return res
      .status(400)
      .json({ message: "Internal server error during registration" });
  const accessToken = createdUser.generateAccessToken();
  return res.status(200).json({
    message: "User registred successfully",
    data: {
      isUserRegisteredSuccessFully,
      accessToken: accessToken,
      deviceToken: deviceToken,
    },
  });
});

const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, rememberMe, deviceToken } = req.body as {
    email: string;
    password: string;
    deviceToken?: string;
    rememberMe: boolean;
  };
  // Data validation
  if (!email || !password)
    return res.status(400).json({ message: "Credentials are missing" });

  if (!isValidEmail(email))
    return res.status(400).json({ message: "Invalid email" });

  if (!isValidPassword(password))
    return res.status(400).json({ message: "Invalid password" });

  const normalizedEmail = email.toLowerCase();
  // check user existence
  const user = await User.findOne({ email: normalizedEmail });

  if (!user)
    return res
      .status(404)
      .json({ message: "User not found with these credentials" });

  // check password
  const isMatchPassword = await user.isCorrectPassword(password);
  if (!isMatchPassword)
    return res.status(401).json({ message: "Invalid password" });

  // generate accessToken and refreshToken
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Prepare update object - always update deviceToken
  const updateData: any = {
    refreshToken: refreshToken,
    deviceToken: deviceToken || "",
  };

  // Update user document
  await User.findByIdAndUpdate(
    user._id,
    { $set: updateData },
    { new: true, validateBeforeSave: false }
  );

  // sending response
  return res.status(200).json({
    message: "User login successfully",
    data: {
      accessToken: accessToken,
      refreshToken: refreshToken,
      deviceToken: deviceToken ? deviceToken : "",
    },
  });
});

const logout = asyncHandler(async (req: Request, res: Response) => {
  const accessToken = req.headers.authorization?.split(" ")[1]; // Bearer token
  const refreshToken = (req.body || {}).refreshToken;
  console.log({ accessToken });
  if (!accessToken && !refreshToken) {
    return res.status(400).json({ message: "No token found" });
  }

  // Add access token to blacklist
  if (accessToken) {
    const decoded: any = jwt.decode(accessToken);

    const expiresAt = decoded.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 60 * 60 * 1000);
    console.log({ decoded });
    console.log({ expiresAt });
    const a = await Blacklist.create({ token: accessToken, expiresAt });
    console.log({ a });
  }

  console.log({ accessToken });
  // Existing refresh token invalidation
  let tokenToInvalidate = refreshToken;
  const user = await User.findById(req.user?._id).select(
    "refreshToken deviceToken"
  );
  if (!tokenToInvalidate && user?.refreshToken)
    tokenToInvalidate = user.refreshToken;

  if (tokenToInvalidate) {
    const u = await User.findOne({ refreshToken: tokenToInvalidate });
    if (u) {
      u.refreshToken = "";
      u.deviceToken = "";
      await u.save({ validateBeforeSave: false });
    }
  }

  return res.status(200).json({
    message: "Logged out successfully",
    refreshToken: tokenToInvalidate,
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

  return res.status(200).json({
    message: "Password changed successfully, please login again",
  });
});

const updateUserDetails = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, middleName, lastName, email, phoneNo, countryCode } =
    req.body as {
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
      phoneNo: string;
      countryCode: string;
    };
  // Data validation
  if (
    !firstName?.trim() ||
    !lastName?.trim() ||
    !email?.trim() ||
    !phoneNo?.trim()
  ) {
    return res.status(400).json({ message: "All credentials are required" });
  }
  if (!isValidEmail(email)) {
    return res.status(404).json({ message: "Invalid email" });
  }

  const user = await User.findById(req.user?._id);
  if (!user)
    return res
      .status(404)
      .json({ message: "User not found or maybe you logout" });

  let data = {
    firstName,
    middleName,
    lastName,
    email,
    phoneNo,
    countryCode,
  };

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        firstName: data.firstName,
        middleName: data.middleName ?? "",
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        phoneNo: data.phoneNo,
        countryCode: data.countryCode,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken -isAgreed");

  console.log("updatedUser", updatedUser);

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
    "-password -refreshToken -isAgreed"
  );
  if (!user)
    return res
      .status(404)
      .json({ message: "User not found or maybe you logout" });
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
  const user = await User.find({ email: email.toLowerCase() });
  console.log("user", user);
  if (user.length === 0)
    return res
      .status(404)
      .json({ message: "OTP send only to registered mail" });
  // generate OTP
  const generate_OTP: string = await generateOTP(email);
  const send_OTP: string = await sendOTPfun(email, generate_OTP);
  return res.status(200).json({
    message: `OTP send successfully to your registered email : ${email.toLowerCase()}`,
  });
});

const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return res.status(400).json({ message: "Missing fields" });
  const normalizedEmail = email.toLowerCase();
  const stored = otpStore.get(normalizedEmail);
  if (!stored)
    return res.status(400).json({ message: "OTP not found or expired" });
  // console.log("stored", stored);

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(normalizedEmail);
    return res.status(400).json({ message: "OTP expired" });
  }

  const isMatch = await bcrypt.compare(otp, stored.hash);
  if (!isMatch) return res.status(400).json({ message: "Invalid OTP" });

  // success
  otpStore.delete(normalizedEmail);

  // create short lived token (10 min)
  const resetToken = jwt.sign(
    { normalizedEmail },
    process.env.RESET_TOKEN_SECRET!,
    {
      expiresIn: "10m",
    }
  );
  return res
    .status(200)
    .json({ message: "OTP verified successfully ✅", resetToken });
});

const getdata = async (req: Request, res: Response) => {
  if (req.user?._id) {
    return res.status(200).json({ message: "user still login" });
  }
}; // This is only for checking that user still logged in or not

const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword, confirmPassword } = req.body as {
    token: string;
    newPassword: string;
    confirmPassword: string;
  };

  if (!token) return res.status(400).json({ message: "Reset token missing" });

  // decode token
  let payload;
  try {
    payload = jwt.verify(token, process.env.RESET_TOKEN_SECRET!);
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired reset token" });
  }

  const email = payload.normalizedEmail;
  console.log({ email });
  const user = await User.findOne({ email: email });

  if (!user) return res.status(404).json({ message: "User not found" });
  if (!isValidPassword(newPassword))
    return res.status(401).json({ message: "Invalid password" });
  if (newPassword !== confirmPassword)
    return res
      .status(401)
      .json({ message: "New and old password must be same" });

  // update password in DB
  user.password = newPassword;
  user.refreshToken = "";
  // user.password = newPassword;
  const updatedUserPassword = await user.save({ validateBeforeSave: false });

  if (!updatedUserPassword)
    return res.status(401).json({
      message:
        "Internal Server error so password is not changed. try again !..",
    });
  return res.status(200).json({
    message: "Password changed successfully, please try to login again",
  });
});

const deleteUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id;
  const deletedUserInfo = await User.deleteOne({ _id: userId });

  if (deletedUserInfo.deletedCount !== 1)
    return res
      .status(401)
      .json({ message: "User profile can't be deleted", deletedUserInfo });

  await Promise.all([
    EmployementInfo.deleteOne({ user: userId }),
    ResidenceInfo.deleteOne({ user: userId }),
    DriversLicInfo.deleteOne({ user: userId }),
    LegalInfo.deleteOne({ user: userId }),
    PersonalInfo.deleteMany({ user: userId }),
    personalRefrenceInfo.deleteOne({ user: userId }),
    Reminder.deleteOne({ user: userId }),
    Bondsman.updateOne(
      {},
      {
        $pull: {
          user: userId,
        },
      }
    ),
  ]);
  return res
    .status(200)
    .json({ message: "User profile deleted", deletedUserInfo });
});

const addResidenceInfo = asyncHandler(async (req: Request, res: Response) => {
  const {
    yearsAtCurrentAddress,
    landlordName,
    landlordAddress,
    homeOwnership,
  } = req.body as {
    yearsAtCurrentAddress: string;
    landlordName: string;
    landlordAddress: string;
    homeOwnership: string;
  };
  const { residenceId } = req.body;
  if (
    !yearsAtCurrentAddress.trim() ||
    !homeOwnership.trim() ||
    !landlordName.trim() ||
    !landlordAddress.trim()
  ) {
    return res.status(404).json({ message: "Fields can't be empty" });
  }
  if (!isValidData(landlordName))
    return res
      .status(400)
      .json({ message: "Invalid landlord name. please use only alphabets" });
  const user = await User.findById(req.user?._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const data = {
    user: req.user?._id,
    yearsAtCurrentAddress: yearsAtCurrentAddress,
    landlordName,
    homeOwnership,
    landlordAddress,
  };
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  let residenceDoc;
  if (residenceId) {
    residenceDoc = await ResidenceInfo.findByIdAndUpdate(
      residenceId,
      {
        $set: data,
      },
      {
        new: true,
      }
    );

    if (!residenceDoc)
      return res.status(404).json({ message: "Data not found or created" });
  } else {
    residenceDoc = await ResidenceInfo.findOneAndUpdate(
      { user: req.user?._id }, // find existing record for user
      { $set: data },
      { new: true, upsert: true } // create if not found
    );
  }

  if (!residenceDoc)
    return res.status(500).json({ message: "Error data can't create" });

  return res.status(200).json({
    message: residenceId ? "Updated succesfully" : "Data save successfully",
    residenceDoc,
    accessToken: accessToken,
    refreshToken: refreshToken,
  });
});

const getResidenceInfo = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?._id);
  if (!user) return res.status(404).json({ message: "User not found" });
  const residenceInfo = await ResidenceInfo.find({ user: req.user?._id });
  if (residenceInfo.length === 0)
    return res.status(200).json({
      message: "No residence info found",
      residenceInfo: residenceInfo,
    });
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  return res.status(200).json({
    message: "Residence data fetched",
    residenceInfo: residenceInfo[0],
    accessToken: accessToken,
    refreshToken: refreshToken,
  });
});

const addContactInfo = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, middleName, lastName, email, phoneNo, countryCode } =
    req.body as {
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
      phoneNo: string;
      countryCode: string;
    };
  if (
    !firstName.trim() ||
    !lastName.trim() ||
    !email.trim() ||
    !phoneNo.trim() ||
    !countryCode.trim()
  )
    return res.status(404).json({ message: "All fields are required" });

  if (
    !isValidData(firstName) ||
    !isValidData(lastName)
  )
    return res.status(400).json({
      message: "Invalid data",
    });
  if (!isValidEmail(email))
    return res.status(400).json({ message: "Invalid email" });
  const data = {
    firstName,
    middleName,
    lastName,
    email,
    phoneNo,
    countryCode,
  };
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        data,
      },
    },
    {
      new: true,
    }
  );
  if (!user) return res.status(404).json({ message: "User not found" });
  if (!user)
    return res.status(500).json({ message: "Error occur during submit data." });
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  return res.status(200).json({
    message: user ? "Updated successfully" : "Data save successfully",
    accessToken: accessToken,
    refreshToken: refreshToken,
  });
});

const getContactInfo = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?._id);
  if (!user) return res.status(404).json({ message: "User not found" });
  const contactInfo = await User.findById(req.user?._id).select(
    "firstName middleName lastName email phoneNo countryCode"
  );
  if (!contactInfo)
    return res
      .status(200)
      .json({ message: "No Contact data found", contactInfo: contactInfo });
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  return res.status(200).json({
    message: "Contact info data fetched",
    contactInfo: contactInfo,
    accessToken: accessToken,
    refreshToken: refreshToken,
  });
});

const addLegalInfo = asyncHandler(async (req: Request, res: Response) => {
  const { attorneyName, attorneyAddress, attorneyPhoneNo } = req.body as {
    attorneyName: string;
    attorneyAddress: string;
    attorneyPhoneNo: string;
  };
  const { legalInfoId } = req.body;
  if (
    !attorneyName.trim() ||
    !attorneyAddress.trim() ||
    !attorneyPhoneNo.trim()
  )
    return res.status(404).json({ message: "Fields can't be empty" });
  if (!isValidData(attorneyName))
    return res.status(400).json({
      message:
        "Invalid attorney name. please use only alphabets and it should be more then 3 charater",
    });
  const user = await User.findById(req.user?._id);
  if (!user) return res.status(404).json({ message: "User not found" });
  let legalInfoDoc;
  const data = {
    user: req.user?._id,
    attorneyName,
    attorneyAddress,
    attorneyPhoneNo,
  };
  if (legalInfoId) {
    legalInfoDoc = await LegalInfo.findByIdAndUpdate(
      legalInfoId,
      {
        $set: data,
      },
      {
        new: true,
      }
    );
    if (!legalInfoDoc)
      return res.status(404).json({ message: "Data not found or created" });
  } else {
    legalInfoDoc = await LegalInfo.findOneAndUpdate(
      { user: req.user?._id }, // find existing record for user
      { $set: data },
      { new: true, upsert: true } // create if not found
    );
  }

  if (!legalInfoDoc)
    return res.status(500).json({ message: "Internal server error." });
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  return res.status(200).json({
    message: legalInfoId ? "Updated successfully" : "Data save successfully",
    accessToken: accessToken,
    refreshToken: refreshToken,
  });
});

const getLegalInfo = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?._id);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (!user.bondsman)
    return res.status(200).json({ message: "No bondsman assign yet" });
  const legalInfo = await User.find({
    _id: user._id,
    bondsman: user?.bondsman,
  })
    .populate([
      { path: "bondsman", select: "name address phoneNo countryCode" },
    ])
    .select("bondsman");
  if (legalInfo.length === 0)
    return res
      .status(200)
      .json({ message: "No Legal data found", legalInfo: legalInfo });
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  return res.status(200).json({
    message: "Legal info data fetched",
    legalInfo: legalInfo[0],
    accessToken: accessToken,
    refreshToken: refreshToken,
  });
});

const addPersonalInfo = asyncHandler(async (req: Request, res: Response) => {
  const {
    weight,
    height,
    race,
    gender,
    eyeColor,
    hairColor,
    birthPlace,
    birthDate,
    UScitizen,
    nickname,
    maritalStatus,
    spouseName,
    spouseOccupation,
    spouseEmployer,
    child,
    isResponsible,
    responsibleDescription,
  } = req.body;

  const { personalInfoId } = req.body;

  const data = {
    user: req.user?._id,
    weight,
    height,
    race,
    gender,
    eyeColor,
    hairColor,
    birthPlace,
    birthDate,
    UScitizen,
    nickname,
    maritalStatus,
    spouseName: maritalStatus ? spouseName : "",
    spouseOccupation: maritalStatus ? spouseOccupation : "",
    spouseEmployer: maritalStatus ? spouseEmployer : "",
    child,
    isResponsible,
    responsibleDescription,
  };
  const user = await User.findById(req.user?._id);
  if (!user) return res.status(404).json({ message: "User not found" });
  let personalInfoDoc;

  // ✅ If personalInfoId exists, update
  if (personalInfoId) {
    personalInfoDoc = await PersonalInfo.findByIdAndUpdate(
      personalInfoId,
      { $set: data },
      { new: true }
    );

    if (!personalInfoDoc) {
      return res.status(404).json({ message: "Personal info not found" });
    }
  }

  // ✅ If no ID passed, create new document
  else {
    personalInfoDoc = await PersonalInfo.findOneAndUpdate(
      { user: req.user?._id }, // find existing record for user
      { $set: data },
      { new: true, upsert: true } // create if not found
    );
  }
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  return res.status(200).json({
    message: personalInfoId ? "Updated successfully" : "Data save successfully",
    accessToken: accessToken,
    refreshToken: refreshToken,
  });
});

const getPersonalInfo = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?._id);
  if (!user) return res.status(404).json({ message: "User not found" });
  const personalInfo = await PersonalInfo.find({ user: req.user?._id });
  if (personalInfo.length === 0)
    return res
      .status(200)
      .json({ message: "No Personal data found", personalInfo: personalInfo });
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  return res.status(200).json({
    message: "Personal info data fetched",
    personalInfo: personalInfo[0],
    accessToken: accessToken,
    refreshToken: refreshToken,
  });
});

const addDriverLicInfo = asyncHandler(async (req: Request, res: Response) => {
  const {
    socialSecurityNumber,
    state,
    drivingLicenseNo,
    havingYourOwnAutomobile, //  if yes then fill further info
    automobileColor,
    automobileMake,
    automobileModel,
    automobileTag,
  } = req.body as {
    socialSecurityNumber: String;
    state: String;
    drivingLicenseNo: String;
    havingYourOwnAutomobile: String; //  if yes then fill further info
    automobileColor: String;
    automobileMake: String;
    automobileModel: String;
    automobileTag: String;
  };
  let { driverLicId } = req.body;
  if (!socialSecurityNumber.trim() || !state.trim() || !drivingLicenseNo.trim())
    return res.status(404).json({ message: "Required fields can't be empty" });
  const data = {
    user: req.user?._id,
    socialSecurityNumber,
    state,
    drivingLicenseNo,
    havingYourOwnAutomobile, //  if yes then fill further info
    automobileColor: automobileColor ?? "",
    automobileMake: automobileMake ?? "",
    automobileModel: automobileModel ?? "",
    automobileTag: automobileTag ?? "",
  };

  let driverLicDoc;
  const user = await User.findById(req.user?._id);
  if (!user) return res.status(404).json({ message: "User not found" });
  // ✅ If driverLicId exists, update
  if (driverLicId) {
    driverLicDoc = await DriversLicInfo.findByIdAndUpdate(
      driverLicId,
      { $set: data },
      { new: true }
    );

    if (!driverLicDoc) {
      return res.status(404).json({ message: "Driver Lic. info not found" });
    }
  } else {
    driverLicDoc = await DriversLicInfo.findOneAndUpdate(
      { user: req.user?._id }, // find existing record for user
      { $set: data },
      { new: true, upsert: true } // create if not found
    );
  }
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  return res.status(200).json({
    message: driverLicId ? "Updated successfully" : "Data save successfully",
    accessToken: accessToken,
    refreshToken: refreshToken,
  });
});

const getDriverLicInfo = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?._id);
  if (!user) return res.status(404).json({ message: "User not found" });
  const driversLicInfo = await DriversLicInfo.find({ user: req.user?._id });
  if (driversLicInfo.length === 0)
    return res.status(200).json({
      message: "No Driver Lic data found",
      driversLicInfo: driversLicInfo,
    });
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  return res.status(200).json({
    message: "Driver Lic info data fetched",
    driversLicInfo: driversLicInfo[0],
    accessToken: accessToken,
    refreshToken: refreshToken,
  });
});

const addPersonalRefrenceInfo = asyncHandler(
  async (req: Request, res: Response) => {
    const { familyMembers, personalRefId } = req.body;
    console.log("familyMembers", familyMembers);
    // Validate array
    if (!Array.isArray(familyMembers) || familyMembers.length === 0) {
      return res.status(400).json({ message: "Family members required" });
    }

    // Validate each member
    for (const m of familyMembers) {
      if (!isValidData(m.name)) {
        return res.status(400).json({ message: `${m.name} is Invalid name` });
      }
    }

    // Format knownDuration → add "Yr"
    const formattedMembers = familyMembers.map((m) => ({
      name: m.name,
      address: m.address,
      phoneNo: m.phoneNo,
      countryCode: m.countryCode,
      knownDuration: m.knownDuration,
    }));
    console.log("formattedMembers", formattedMembers);
    const user = await User.findById(req.user?._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    console.log("user", user);
    let personalRefDoc;

    // Update
    if (personalRefId) {
      personalRefDoc = await personalRefrenceInfo.findByIdAndUpdate(
        personalRefId,
        { $set: { user: req.user._id, familyMembers: formattedMembers } },
        { new: true }
      );
    }
    // Create / upsert
    else {
      personalRefDoc = await personalRefrenceInfo.findOneAndUpdate(
        { user: req.user._id },
        { $set: { familyMembers: formattedMembers } },
        { new: true, upsert: true }
      );
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    if (!personalRefDoc)
      return res.status(500).json({ message: "Internal server error" });

    return res.status(200).json({
      message: personalRefId
        ? "Updated successfully"
        : "Data saved successfully",
      accessToken: accessToken,
      refreshToken: refreshToken,
      personalRefDoc: personalRefDoc,
    });
  }
);

const getPersonalRefrenceInfo = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await User.findById(req.user?._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const personalRefInfo = await personalRefrenceInfo.find({
      user: req.user?._id,
    });
    if (personalRefInfo.length === 0)
      return res.status(200).json({
        message: "No Personal Ref Info Lic data found",
        personalRefInfo: personalRefInfo,
      });
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    return res.status(200).json({
      message: "Personal Ref Info data fetched",
      personalRefInfo: personalRefInfo,
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  }
);

const addEmployementStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      employementStatus, // if yes then fill further info
      employerName,
      employerSupervisorName,
      employerAddress,
      employerWorkingPeriod,
      automobileColor,
      previousEmployer,
    } = req.body as {
      employementStatus: string; // if yes then fill further info
      employerName: string;
      employerSupervisorName: string;
      employerAddress: string;
      employerWorkingPeriod: string;
      automobileColor: string;
      previousEmployer: string;
    };
    const { employeeId } = req.body;

    const data = {
      user: req.user?._id,
      employementStatus, // if yes then fill further info
      employerName: employerName ?? " ",
      employerSupervisorName: employerSupervisorName ?? " ",
      employerAddress: employerAddress ?? " ",
      employerWorkingPeriod: employerWorkingPeriod
        ? employerWorkingPeriod
        : " ",
      automobileColor: automobileColor ?? " ",
      previousEmployer: previousEmployer ?? " ",
    };

    let employeeDoc;
    const user = await User.findById(req.user?._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (employeeId) {
      employeeDoc = await EmployementInfo.findByIdAndUpdate(
        employeeId,
        {
          $set: data,
        },
        {
          new: true,
        }
      );

      if (!employeeDoc)
        return res.status(404).json({ message: "Data not found or update" });
    } else {
      employeeDoc = await EmployementInfo.findOneAndUpdate(
        { user: req.user?._id }, // find existing record for user
        { $set: data },
        { new: true, upsert: true } // create if not found
      );
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    if (!employeeDoc)
      return res.status(500).json({
        message: "Internal server error occur during submitting data",
      });
    return res.status(200).json({
      message: employeeId ? "Updated successfully" : "Data save successfully",
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  }
);

const getEmployementStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await User.findById(req.user?._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const employementInfo = await EmployementInfo.find({
      user: req.user?._id,
    });
    if (employementInfo.length === 0)
      return res.status(200).json({
        message: "No Employement data found",
        employementInfo: employementInfo,
      });
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    return res.status(200).json({
      message: "Employement data fetched",
      employementInfo: employementInfo[0],
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  }
);

const getUserBondsmanInfo = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Pagination Setup
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const userId = new mongoose.Types.ObjectId(req.user!._id);
    const now = new Date();

    // 2. ⭐️ ORIGINAL CLEANUP LOGIC (Maintain as requested) ⭐️
    // Note: This logic seems to target the Reminder collection, not the User's array,
    // and its effectiveness in pulling expired IDs from the User's array is uncertain.
    const expiredReminderDocs = await Reminder.find({
      user: userId,
      reminderDateTime: { $lt: now },
      // $or: [
      //   { reminderDate: { $lt: now } },
      //   { reminderTime: { $lt: now.getTime() } },
      // ],
    }).select("_id");

    const expiredReminderIds = expiredReminderDocs.map((doc) => doc._id);
    console.log({ expiredReminderIds });
    if (expiredReminderIds.length > 0) {
      // 2. 🗑️ Clean up the User's reminders array (Update the User Collection)
      // We use User.updateOne/updateMany to pull IDs from the User's array
      await User.updateOne(
        { _id: userId },
        {
          $pullAll: { reminders: expiredReminderIds },
        }
      );

      // 3. 📝 Deactivate the Reminder documents (Update the Reminder Collection)
      // We update the Reminder documents themselves to set isActive: false
      await Reminder.updateMany(
        {
          _id: { $in: expiredReminderIds }, // Filter Reminders by their actual IDs
        },
        {
          $set: { isActive: false },
        }
      );
    }
    // -------------------------------------------------------------

    // 3. User Info (Bondsman and general user info)
    // We fetch user info separately, excluding reminders for the main object.
    const userInfo = await User.findById(userId)
      .select("-reminders")
      .populate("bondsman")
      .lean();

    if (!userInfo) return res.status(404).json({ message: "User not found" });

    // 4. ⭐️ AGGREGATION FOR PAGINATED REMINDERS ⭐️

    // Total count calculation (must be done before skip/limit)
    const totalRemindersCount = await User.aggregate([
      { $match: { _id: userId } },
      { $project: { count: { $size: "$reminders" } } },
    ]);
    const totalCount =
      totalRemindersCount.length > 0 ? totalRemindersCount[0].count : 0;

    let reminders: any[] = [];

    if (totalCount > 0) {
      const reminderPipeline: PipelineStage[] = [
        { $match: { _id: userId } },

        // Stage 1: Unwind the reminders array
        { $unwind: "$reminders" },

        // Stage 2: Lookup Reminder details (Populate)
        {
          $lookup: {
            from: "reminders",
            localField: "reminders",
            foreignField: "_id",
            as: "reminderData",
          },
        },
        // Use preserveNullAndEmptyArrays: true to prevent dropping documents if lookup fails
        {
          $unwind: { path: "$reminderData", preserveNullAndEmptyArrays: true },
        },
        { $match: { reminderData: { $ne: null } } }, // Filter out stale IDs

        // Stage 3: Lookup Court details (Nested Populate)
        {
          $lookup: {
            from: "courts",
            localField: "reminderData.court",
            foreignField: "_id",
            as: "courtData",
          },
        },
        { $unwind: { path: "$courtData", preserveNullAndEmptyArrays: true } },

        // Stage 4: Sort (Recommended, using createdAt)
        { $sort: { "reminderData.reminderDateTime": 1 } },

        // Stage 5: Apply Pagination
        { $skip: skip },
        { $limit: limit },

        // Stage 6: Project the final output structure matching original populate select
        {
          $project: {
            _id: "$reminderData._id",
            // Reminder fields
            reminderTitle: "$reminderData.reminder",
            reminderDate: "$reminderData.reminderDate",
            reminderTime: "$reminderData.reminderTime",
            roomNumber: "$reminderData.roomNumber",
            // Nested Court fields (matching original populate structure)
            court: {
              $ifNull: [
                {
                  _id: "$courtData._id",
                  courtName: "$courtData.courtName",
                  addressLine: "$courtData.addressLine",
                  city: "$courtData.city",
                  state: "$courtData.state",
                  country: "$courtData.country",
                  reminder: "$courtData.reminder",
                  // roomNumber: "$courtData.roomNumber",
                },
                null,
              ],
            },
          },
        },
      ];

      reminders = await User.aggregate(reminderPipeline);
    }
    // -------------------------------------------------------------

    // 5. Check-In / Check-Out Data (Uses findOne and sort/limit for efficiency)
    // const getCheckInData = await CheckIn.findOne({ user: userId }).sort({ createdAt: -1 });
    // const getCheckOutData = await CheckOut.findOne({ user: userId }).sort({ createdAt: -1 });
    const getActiveCheckInData = await CheckIn.findOne({
      user: userId,
      isCheckIn: true, // ⭐️ CRITICAL FILTER: Only fetch active check-ins ⭐️
    }).sort({ createdAt: -1 });

    // Get the LATEST document where isCheckOut is TRUE
    const getActiveCheckOutData = await CheckOut.findOne({
      user: userId,
      isCheckOut: true, // ⭐️ CRITICAL FILTER: Only fetch active check-outs ⭐️
    }).sort({ createdAt: -1 });

    // 6. Token Generation (Based on your original code structure)
    // NOTE: This requires the User model instance, not the lean() object 'userInfo'.
    // We rely on the original logic structure here, but typically tokens are generated
    // from the non-lean Mongoose document. Since we already fetched userInfo as lean,
    // we'll fetch the Mongoose doc just for token generation, if needed.
    const userDocForToken = await User.findById(userId);

    // Generate tokens only if userDocForToken is found and methods exist
    const accessToken = userDocForToken?.generateAccessToken();
    const refreshToken = userDocForToken?.generateRefreshToken();

    // 7. Final Response
    return res.status(200).json({
      message: "Bondsman Information",
      accessToken: accessToken,
      refreshToken: refreshToken,

      // isBondsmanExist now holds userInfo + bondsman populated
      isBondsmanExist: userInfo,

      // PAGINATED REMINDERS
      reminders: reminders,
      totalReminders: totalCount,
      page,
      limit,

      // Check-in/out data formatting matching original logic
      getChekInData: getActiveCheckInData || "",
      getCheckOutData: getActiveCheckOutData || "",

      isCheckIn: !!getActiveCheckInData, // True if document found, false otherwise
      isCheckOut: !!getActiveCheckOutData, // True if document found, false otherwise
    });
  }
);

// const getUserBondsmanInfo = asyncHandler(
//   async (req: Request, res: Response) => {
//     const now = new Date();

//     await Reminder.updateMany(
//       { user: req.user?._id },
//       {
//         $pull: {
//           reminders: {
//             $or: [
//               { reminderDate: { $lt: now } },
//               { reminderTime: { $lt: now.getTime() } },
//             ],
//           },
//         },
//       }
//     );
//     const isBondsmanExist = await User.findById(req.user?._id).populate([
//       {
//         path: "reminders",
//         populate: {
//           path: "court",
//           select: "courtName addressLine city state country reminder",
//         }, // <-- Nested populate
//       },
//       { path: "bondsman" },
//     ]);
//     if (!isBondsmanExist)
//       return res.status(404).json({ message: "User not found" });
//     const getChekInData = await CheckIn.find({ user: req.user?._id })
//       .sort({ createdAt: -1 }) // newest first
//       .limit(1);

//     const getCheckOutData = await CheckOut.find({ user: req.user?._id })
//       .sort({ createdAt: -1 }) // newest first
//       .limit(1);
//     const accessToken = isBondsmanExist.generateAccessToken();
//     const refreshToken = isBondsmanExist.generateRefreshToken();

//     return res.status(200).json({
//       message: "Bondsman Information",
//       accessToken: accessToken,
//       refreshToken: refreshToken,
//       isBondsmanExist,
//       getChekInData:
//         getChekInData.length === 0
//           ? "No Check-in data found"
//           : getChekInData[0],
//       getCheckOutData:
//         getCheckOutData.length === 0
//           ? "No Check-out data found"
//           : getCheckOutData[0],
//       isCheckIn:
//         getChekInData.length === 0 ? false : getChekInData[0].isCheckIn,
//       isCheckOut:
//         getCheckOutData.length === 0 ? false : getCheckOutData[0].isCheckOut,
//     });
//   }
// );

const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const getChekInData = await CheckIn.find({ user: req.user?._id })
    .lean()
    .populate("user", "firstName middleName lastName");
  const getCheckOutData = await CheckOut.find({ user: req.user?._id })
    .lean()
    .populate("user", "firstName middleName lastName");

  const checkInMapped = getChekInData.map((item) => ({
    ...item,
    type: "checkIn",
  }));
  const checkOutMapped = getCheckOutData.map((item) => ({
    ...item,
    type: "checkOut",
  }));

  const timeLine = [...checkInMapped, ...checkOutMapped];
  timeLine.sort(
    (a, b) =>
      new Date(b.createdAt as any).getTime() -
      new Date(a.createdAt as any).getTime()
  );

  const paginated = timeLine.slice(skip, skip + limit);
  res.json({
    total: timeLine.length,
    page,
    limit,
    data: paginated,
  });
});

// const createOrUpdateCheckIn = asyncHandler(
//   async (req: Request, res: Response) => {
//     console.log("API_HIT", req.body);

//     const userId = req.user?._id;
//     const { lat, long } = req.body;
//     const now = new Date();

//     /* ----------------------------------
//        TIME WINDOW (12:00 AM → 11:59:59 PM)
//     -----------------------------------*/
//     const startOfDay = new Date();
//     startOfDay.setHours(0, 0, 0, 0);

//     const endOfDay = new Date();
//     endOfDay.setHours(23, 59, 59, 999);

//     const isWithinTodayWindow = (date: Date) =>
//       date >= startOfDay && date <= endOfDay;

//     // Get the latest checkout
//     const lastCheckOut = await CheckOut.findOne({
//       user: userId,
//       isCheckOut: true,
//     }).sort({ createdAt: -1 });

//     // Disable check-in if last checkout is within today window
//     if (lastCheckOut) {
//       const lastCheckOutTime = new Date(lastCheckOut.createdAt as any);

//       if (isWithinTodayWindow(lastCheckOutTime)) {
//         return res.status(400).json({
//           message:
//             "You already checked out today. Come back tomorrow.",
//         });
//       }
//     }

//     // Optional image upload
//     let uploadedImageUrl: string;
//     if (req.file && req.file.buffer) {
//       const imgUpload = await uploadToCloudinary(req.file.buffer);
//       if (!imgUpload)
//         return res.status(400).json({ message: "Image upload failed" });
//       uploadedImageUrl = imgUpload.secure_url;
//     }

//     // Find the latest check-in
//     let checkIn = await CheckIn.findOne({ user: userId, isCheckIn: true }).sort(
//       { createdAt: -1 }
//     );

//     if (checkIn) {
//       const checkInTime = new Date(checkIn.createdAt as any);

//       // Reset old check-in if it does NOT belong to today window
//       if (!isWithinTodayWindow(checkInTime)) {
//         checkIn.isCheckIn = false;
//         await checkIn.save();
//         checkIn = null;
//       }
//     }

//     if (checkIn) {
//       // Update existing check-in
//       const sameLat = Number(checkIn.location.lat) === Number(lat);
//       const sameLong = Number(checkIn.location.long) === Number(long);
//       const samePhoto =
//         !uploadedImageUrl || uploadedImageUrl === checkIn.photoUrl;
//       const isSameData = sameLat && sameLong && samePhoto;

//       if (!isSameData) {
//         checkIn.location = { lat, long };
//         if (uploadedImageUrl) checkIn.photoUrl = uploadedImageUrl;
//       }

//       checkIn.set("updatedAt", now);
//       await checkIn.save();
//     } else {
//       // Create new check-in
//       checkIn = await CheckIn.create({
//         user: userId,
//         photoUrl: uploadedImageUrl ?? " ",
//         location: { lat, long },
//         isCheckIn: true,
//       });

//       // Reset any active checkout for safety
//       await CheckOut.updateMany(
//         { user: userId, isCheckOut: true },
//         { isCheckOut: false }
//       );
//     }

//     return res.status(200).json({
//       message: "Check-in recorded",
//       checkIn: {
//         createdAt: checkIn.createdAt,
//         updatedAt: checkIn.updatedAt,
//         photoUrl: checkIn.photoUrl ?? " ",
//         location: checkIn.location,
//         isCheckIn: checkIn.isCheckIn,
//       },
//     });
//   }
// );

const createOrUpdateCheckIn = asyncHandler(
  async (req: Request, res: Response) => {
    console.log("API_HIT", req.body);

    const userId = req.user?._id;
    const { lat, long } = req.body;
    const now = new Date();
    const threeMinutes = 2 * 60 * 1000;

    // Get the latest checkout
    const lastCheckOut = await CheckOut.findOne({
      user: userId,
      isCheckOut: true,
    }).sort({ createdAt: -1 });

    // Disable check-in if last checkout is within 3 minutes
    if (lastCheckOut) {
      const diff =
        now.getTime() - new Date(lastCheckOut.createdAt as any).getTime();

      if (diff <= threeMinutes) {
        return res.status(400).json({
          message:
            "You already checked out recently. Come back after 3 minutes.",
        });
      }
    }

    // Optional image upload
    let uploadedImageUrl: string;
    if (req.file && req.file.buffer) {
      const imgUpload = await uploadToCloudinary(req.file.buffer);
      if (!imgUpload)
        return res.status(400).json({ message: "Image upload failed" });
      uploadedImageUrl = imgUpload.secure_url;
    }

    // Find the latest check-in
    let checkIn = await CheckIn.findOne({ user: userId, isCheckIn: true }).sort(
      { createdAt: -1 }
    );
    let diff;
    if (checkIn) {
      diff = now.getTime() - new Date(checkIn.createdAt as any).getTime();
      if (diff > threeMinutes) {
        // Reset old check-in
        checkIn.isCheckIn = false;
        await checkIn.save();
        checkIn = null;
      }
    }
    if (checkIn) {
      const checkInId = checkIn._id;

      // setTimeout(async () => {
      //   const currentCheckIn = await CheckIn.findById(checkInId);

      //   if (currentCheckIn && currentCheckIn.isCheckIn === true) {
      //     console.log(
      //       `Auto-checkout for user ${userId} and checkIn ${checkInId}`
      //     ); // Reset old check-in
      //     currentCheckIn.isCheckIn = false;
      //     await currentCheckIn.save(); // Create a new CheckOut record for the automatic checkout

      //     await CheckOut.create({
      //       user: userId,
      //       isCheckOut: true,
      //     });
      //   }
      // }, threeMinutes);
    }

    if (checkIn) {
      // Update existing check-in
      const sameLat = Number(checkIn.location.lat) === Number(lat);
      const sameLong = Number(checkIn.location.long) === Number(long);
      const samePhoto =
        !uploadedImageUrl || uploadedImageUrl === checkIn.photoUrl;
      const isSameData = sameLat && sameLong && samePhoto;

      if (!isSameData) {
        checkIn.location = { lat, long };
        if (uploadedImageUrl) checkIn.photoUrl = uploadedImageUrl;
      }

      checkIn.set("updatedAt", now);
      await checkIn.save();
    } else {
      // Create new check-in
      checkIn = await CheckIn.create({
        user: userId,
        photoUrl: uploadedImageUrl ?? " ",
        location: { lat, long },
        isCheckIn: true,
      });

      // Reset any active checkout for safety
      await CheckOut.updateMany(
        { user: userId, isCheckOut: true },
        { isCheckOut: false }
      );
    }

    return res.status(200).json({
      message: "Check-in recorded",
      checkIn: {
        createdAt: checkIn.createdAt,
        updatedAt: checkIn.updatedAt,
        photoUrl: checkIn.photoUrl ?? " ",
        location: checkIn.location,
        isCheckIn: checkIn.isCheckIn,
      },
    });
  }
);

const getUserCheckInStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const getUserCheckIn = await CheckIn.find({ user: req.user?._id });
    if (getUserCheckIn.length === 0)
      return res.status(404).json({
        message: "No CheckIn found",
      });
    return res.status(200).json({
      message:
        getUserCheckIn.length === 0
          ? "No check-in found"
          : `${getUserCheckIn.length} Check-in found`,
      getUserCheckIn: getUserCheckIn[0],
    });
  }
);

// const checkOut = asyncHandler(async (req: Request, res: Response) => {
//   const userId = req.user?._id;
//   const { lat, long } = req.body;
//   const now = new Date();

//   /* ----------------------------------
//      TIME WINDOW (12:00 AM → 11:59:59 PM)
//   -----------------------------------*/
//   const startOfDay = new Date();
//   startOfDay.setHours(0, 0, 0, 0);

//   const endOfDay = new Date();
//   endOfDay.setHours(23, 59, 59, 999);

//   const isWithinTodayWindow = (date: Date) =>
//     date >= startOfDay && date <= endOfDay;

//   // Get last checkout
//   let checkOut = await CheckOut.findOne({ user: userId }).sort({
//     createdAt: -1,
//   });

//   // Block checkout if already done today
//   if (checkOut && checkOut.isCheckOut) {
//     const lastCheckoutTime = new Date(checkOut.createdAt as any);

//     if (isWithinTodayWindow(lastCheckoutTime)) {
//       return res.status(400).json({
//         message: "You already checked out today.",
//       });
//     }
//   }

//   // Get last active check-in
//   const lastCheckIn = await CheckIn.findOne({
//     user: userId,
//     isCheckIn: true,
//   }).sort({ createdAt: -1 });

//   if (!lastCheckIn) {
//     return res
//       .status(400)
//       .json({ message: "You cannot check out without checking in." });
//   }

//   // Optional image upload
//   let uploadedImageUrl: string = "";
//   if (req.file && req.file.buffer) {
//     const imgUpload = await uploadToCloudinary(req.file.buffer);
//     if (!imgUpload)
//       return res.status(400).json({ message: "Image upload failed" });
//     uploadedImageUrl = imgUpload.secure_url;
//   }

//   // Create new checkout
//   checkOut = await CheckOut.create({
//     user: userId,
//     photoUrl: uploadedImageUrl ?? " ",
//     location: { lat, long },
//     isCheckOut: true,
//     checkInID: lastCheckIn._id,
//   });

//   // Mark active check-in as false
//   await CheckIn.updateMany(
//     { user: userId, isCheckIn: true },
//     { isCheckIn: false }
//   );

//   // ⛔ setTimeout REMOVED
//   // ✅ Reset handled by CRON using same time window logic

//   return res.status(200).json({
//     message: "Checkout recorded",
//     checkOut: {
//       createdAt: checkOut.createdAt,
//       updatedAt: checkOut.updatedAt,
//       photoUrl: checkOut.photoUrl ?? " ",
//       location: checkOut.location,
//       isCheckOut: checkOut.isCheckOut,
//     },
//   });
// });

const checkOut = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id;
  const { lat, long } = req.body;
  const now = new Date();
  const threeMinutes = 2 * 60 * 1000;

  // Get last checkout
  let checkOut = await CheckOut.findOne({ user: userId }).sort({
    createdAt: -1,
  });

  if (checkOut) {
    const diff = now.getTime() - new Date(checkOut.createdAt as any).getTime();
    if (diff <= threeMinutes && checkOut.isCheckOut) {
      return res
        .status(400)
        .json({ message: "You already checked out recently." });
    }
  }

  // Get last check-in
  const lastCheckIn = await CheckIn.findOne({
    user: userId,
    isCheckIn: true,
  }).sort({ createdAt: -1 });
  if (!lastCheckIn) {
    return res
      .status(400)
      .json({ message: "You cannot check out without checking in." });
  }

  // Optional image upload
  let uploadedImageUrl: string = "";
  if (req.file && req.file.buffer) {
    const imgUpload = await uploadToCloudinary(req.file.buffer);
    if (!imgUpload)
      return res.status(400).json({ message: "Image upload failed" });
    uploadedImageUrl = imgUpload.secure_url;
  }

  // Create new checkout
  checkOut = await CheckOut.create({
    user: userId,
    photoUrl: uploadedImageUrl ?? " ",
    location: { lat, long },
    isCheckOut: true,
    checkInID: lastCheckIn?._id,
  });

  // Mark check-in as false
  await CheckIn.updateMany(
    { user: userId, isCheckIn: true },
    { isCheckIn: false }
  );

  // Auto-reset isCheckOut after 3 minutes
  setTimeout(async () => {
    // Step 1: reset checkout
    await CheckOut.findByIdAndUpdate(checkOut._id, { isCheckOut: false });

    // Step 2: enable check-in again
    await CheckIn.updateMany({ user: userId }, { isCheckIn: false });

    console.log("Auto-reset: checkout false, checkin true");
  }, threeMinutes);

  return res.status(200).json({
    message: "Checkout recorded",
    checkOut: {
      createdAt: checkOut.createdAt,
      updatedAt: checkOut.updatedAt,
      photoUrl: checkOut.photoUrl ?? " ",
      location: checkOut.location,
      isCheckOut: checkOut.isCheckOut,
    },
  });
});

const userCheckInHistory = asyncHandler(async (req: Request, res: Response) => {
  const isUserExist = await CheckIn.find({ user: req.user?._id }).sort({
    createdAt: -1,
  });
  if (!isUserExist) return res.status(404).json({ message: "User not found" });
  // const history = await CheckIn.find({ user: userId });
  console.log("user", isUserExist);
  if (!isUserExist || isUserExist.length === 0)
    return res.status(404).json({ message: "No check-in history found" });
  return res.status(200).json({ message: "History found", isUserExist });
});

// User update their home address and send a picture to their bondsman as proof
const updateAddressAndSendPictureAsProof = asyncHandler(
  async (req: Request, res: Response) => {
    const { homeAddress } = req.body as { homeAddress: String };
    if (!homeAddress)
      return res.status(401).json({
        message: "Home address can't be empty",
      });

    const uploads = await uploadToCloudinary(req.file?.buffer!);
    if (!uploads)
      return res.status(401).json({ message: "eror during upload img" });
    console.log("uploads", uploads);

    const updateUserAddress = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          homeAddress: homeAddress,
          image: uploads.secure_url,
        },
      },
      {
        new: true,
      }
    );
    const isUserAddressUpdated = await User.findById(
      updateUserAddress?._id
    ).select("-refreshToken -password");
    if (!isUserAddressUpdated)
      return res
        .status(400)
        .json({ message: "Address or image can't be update" });

    return res
      .status(200)
      .json({ message: "Address submitted", isUserAddressUpdated });
  }
);

const updateLatAndLong = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude } = req.body as {
    latitude: number;
    longitude: number;
  };
  if (!latitude || !longitude) {
    return res
      .status(400)
      .json({ message: "Please provide latitude and longitude" });
  }

  const user = await User.findById(req.user?._id);
  user.latitude = latitude;
  user.longitude = longitude;
  const updatedLocation = await user.save({ validateBeforeSave: true });

  // if (!updatedLocation)
  //   return res.status(400).json({ message: "Location couldn't be updated" });

  return res
    .status(200)
    .json({ message: "Location updated successfully", updatedLocation });
});

const getReminderNotification = asyncHandler(
  async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const lastId = req.query.lastId as string | undefined;

    const queryFilter: any = {
      user: req.user?._id,
    };

    if (lastId) {
      queryFilter._id = { $gt: new mongoose.Types.ObjectId(lastId) };
    }

    const reminderNotifications = await ReminderNotification.find(queryFilter)
      .sort({ _id: 1 })
      .limit(limit);
    console.log({ reminderNotifications });
    let nextCursorId: string | undefined = undefined;
    console.log({ nextCursorId });

    if (reminderNotifications.length === limit) {
      nextCursorId =
        reminderNotifications[reminderNotifications.length - 1]._id.toString();
    }
    console.log("1", nextCursorId);

    if (reminderNotifications.length === 0 && !lastId)
      return res.status(200).json({ message: "No notification found" });

    return res.status(200).json({
      message: "Notifications found",
      limit: limit,
      nextCursorId: nextCursorId,
      reminderNotifications,
    });
  }
);

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
  addResidenceInfo,
  addContactInfo,
  addLegalInfo,
  addPersonalInfo,
  addDriverLicInfo,
  addPersonalRefrenceInfo,
  addEmployementStatus,
  getUserBondsmanInfo,
  createOrUpdateCheckIn,
  updateAddressAndSendPictureAsProof,
  updateLatAndLong,
  getResidenceInfo,
  getContactInfo,
  getLegalInfo,
  getPersonalInfo,
  getDriverLicInfo,
  getPersonalRefrenceInfo,
  getEmployementStatus,
  getUserCheckInStatus,
  checkOut,
  userCheckInHistory,
  getHistory,
  refreshAccessToken,
  getReminderNotification,
};
