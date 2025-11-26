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
  ContactInfo,
  PersonalInfo,
  DriversLicInfo,
  personalRefrenceInfo,
  EmployementInfo,
  CheckIn,
  CheckOut,
} from "../models/user.model.js";
import { Bondsman, Court } from "../models/bondsman.model.js";
import { generateOTP, sendOTPfun, otpStore } from "../utils/OTPsender.js";
import bcrypt from "bcryptjs";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

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
    middleName: string;
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
    !middleName?.trim() ||
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
    middleName,
    lastName,
    email: normalizedEmail,
    password,
    phoneNo: `${countryCode}${phoneNo}`,
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
      accessToken: `${accessToken}`,
      deviceToken: deviceToken ? deviceToken : "",
    },
  });
});

const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = (req.body || {}) as { refreshToken?: string };

  // If no refreshToken in body, use the logged-in user's token
  let tokenToInvalidate = refreshToken;

  // Access token will give us req.user
  if (!tokenToInvalidate && req.user?._id) {
    const user = await User.findById(req.user?._id).select("refreshToken");
    if (user?.refreshToken) tokenToInvalidate = user.refreshToken;
  }

  // If still no refresh token → cannot logout
  if (!tokenToInvalidate) {
    return res.status(400).json({
      message: "No refresh token found, cannot logout",
    });
  }

  // Find user by refresh token
  const user = await User.findOne({ refreshToken: tokenToInvalidate });

  if (!user) {
    return res.status(400).json({
      message: "Invalid refresh token",
    });
  }

  // Clear refreshToken + deviceToken in DB
  user.refreshToken = "";
  user.deviceToken = "";
  await user.save({ validateBeforeSave: false });

  return res.status(200).json({
    message: "Logged out successfully",
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
  const { firstName, middleName, lastName, email, phoneNo, street, ZipCode } =
    req.body as {
      firstName: string;
      middleName: string;
      lastName: string;
      email: string;
      phoneNo: string;
      street: string;
      ZipCode: string;
    };
  // Data validation
  if (
    !firstName?.trim() ||
    !middleName?.trim() ||
    !lastName?.trim() ||
    !email?.trim() ||
    !phoneNo?.trim() ||
    !street?.trim() ||
    !ZipCode?.trim()
  ) {
    return res.status(400).json({ message: "All credentials are required" });
  }
  if (!isValidEmail(email)) {
    return res.status(404).json({ message: "Invalid email" });
  }
  if (street.length > 100 || ZipCode.length > 11)
    return res.status(400).json({ message: "Street or ZIP code is too long" });

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
    street,
    ZipCode,
  };

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        phoneNo: `${user.countryCode}${data.phoneNo}`,
        street: data.street,
        ZipCode: data.ZipCode,
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
  const deletedUserInfo = await User.deleteOne({ _id: req.user?._id });

  if (deletedUserInfo.deletedCount !== 1)
    return res
      .status(401)
      .json({ message: "User profile can't be deleted", deletedUserInfo });
  return res
    .status(200)
    .json({ message: "User profile deleted", deletedUserInfo });
});

const addResidenceInfo = asyncHandler(async (req: Request, res: Response) => {
  const { yearsAtCurrentAddress, landlordName, landlordAddress,homeOwnership } = req.body as {
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
    yearsAtCurrentAddress: `${yearsAtCurrentAddress} Yr`,
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
  if (!residenceInfo)
    return res.status(404).json({ message: "No residence data found" });
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
  const { firstName, middleName, lastName, email, phoneNo } = req.body as {
    firstName: string;
    middleName: string;
    lastName: string;
    email: string;
    phoneNo: string;
  };
  const { contactInfoId } = req.body;
  if (
    !firstName.trim() ||
    !middleName.trim() ||
    !lastName.trim() ||
    !email.trim() ||
    !phoneNo.trim()
  )
    return res.status(404).json({ message: "All fields are required" });

  if (
    !isValidData(firstName) ||
    !isValidData(middleName) ||
    !isValidData(lastName)
  )
    return res.status(400).json({
      message:
        "firstName, middleName or lastName has invalid type. please include only alphabets and length should be more then 3 char ",
    });
  if (!isValidEmail(email))
    return res.status(400).json({ message: "Invalid email" });
  const user = await User.findById(req.user?._id);
  if (!user) return res.status(404).json({ message: "User not found" });
  const data = {
    user: req.user?._id,
    firstName,
    middleName,
    lastName,
    email,
    phoneNo: `${user.countryCode}${phoneNo}`,
  };
  let contactInfoDoc;
  if (contactInfoId) {
    contactInfoDoc = await ContactInfo.findByIdAndUpdate(
      contactInfoId,
      {
        $set: data,
      },
      {
        new: true,
      }
    );

    if (!contactInfoId)
      return res.status(404).json({ message: "Data not found or created" });
  } else {
    contactInfoDoc = await ContactInfo.findOneAndUpdate(
      { user: req.user?._id }, // find existing record for user
      { $set: data },
      { new: true, upsert: true } // create if not found
    );
  }

  if (!contactInfoDoc)
    return res.status(500).json({ message: "Error occur during submit data." });
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  return res.status(200).json({
    message: contactInfoId ? "Updated successfully" : "Data save successfully",
    accessToken: accessToken,
    refreshToken: refreshToken,
  });
});

const getContactInfo = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?._id);
  if (!user) return res.status(404).json({ message: "User not found" });
  const contactInfo = await ContactInfo.find({ user: req.user?._id });
  if (!contactInfo)
    return res.status(404).json({ message: "No Contact data found" });
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  return res.status(200).json({
    message: "Contact info data fetched",
    contactInfo: contactInfo[0],
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
  const legalInfo = await LegalInfo.find({ user: req.user?._id });
  if (!legalInfo)
    return res.status(404).json({ message: "No Legal data found" });
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
  if (!personalInfo)
    return res.status(404).json({ message: "No Personal data found" });
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
    automobikeColor,
    automobikeMake,
    automobikeNumberPlate,
    automobikeModel,
  } = req.body as {
    socialSecurityNumber: String;
    state: String;
    drivingLicenseNo: String;
    havingYourOwnAutomobile: String; //  if yes then fill further info
    automobikeColor: String;
    automobikeMake: String;
    automobikeNumberPlate: String;
    automobikeModel: String;
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
    automobikeColor: automobikeColor ?? "",
    automobikeMake: automobikeMake ?? "",
    automobikeNumberPlate: automobikeNumberPlate ?? "",
    automobikeModel: automobikeModel ?? "",
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
  if (!driversLicInfo)
    return res.status(404).json({ message: "No Driver Lic data found" });
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  return res.status(200).json({
    message: "Driver Lic info data fetched",
    driversLicInfo: driversLicInfo,
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
      knownDuration: `${m.knownDuration} Yr`,
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
    if (!personalRefInfo)
      return res
        .status(404)
        .json({ message: "No Personal Ref Info Lic data found" });
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
        ? `${employerWorkingPeriod} Yr`
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
    if (!employementInfo)
      return res.status(404).json({ message: "No Employement data found" });
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
    const isBondsmanExist = await User.findById(req.user?._id).populate(
      "reminders"
    );
    if (!isBondsmanExist)
      return res.status(404).json({ message: "User not found" });
    const getChekInData = await CheckIn.find({ user: req.user?._id });
    const getCheckOutData = await CheckOut.find({ user: req.user?._id });
    const accessToken = isBondsmanExist.generateAccessToken();
    const refreshToken = isBondsmanExist.generateRefreshToken();

    return res.status(200).json({
      message: "Bondsman Information",
      accessToken: accessToken,
      refreshToken: refreshToken,
      isBondsmanExist,
      getChekInData,
      getCheckOutData,
    });
  }
);

const createOrUpdateCheckIn = asyncHandler(
  async (req: Request, res: Response) => {
    console.log("API_HIT", req.body);

    const userId = req.user?._id;
    const { lat, long } = req.body;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    let uploadedImageUrl: string;

    // Optional image upload
    if (req.file && req.file.buffer) {
      const imgUpload = await uploadToCloudinary(req.file.buffer);
      if (!imgUpload)
        return res.status(400).json({ message: "Image upload failed" });

      uploadedImageUrl = imgUpload.secure_url;
    }

    // Check existing check-in
    let checkIn = await CheckIn.findOne({
      user: userId,
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });

    const now = new Date();

    if (checkIn) {
      // Compare existing values
      const sameLat = Number(checkIn.location.lat) === Number(lat);
      const sameLong = Number(checkIn.location.long) === Number(long);
      const samePhoto =
        !uploadedImageUrl || uploadedImageUrl === checkIn.photoUrl;

      const isSameData = sameLat && sameLong && samePhoto;

      if (isSameData) {
        checkIn.set("createdAt", now);
        checkIn.set("updatedAt", now);
      } else {
        checkIn.location.lat = lat;
        checkIn.location.long = long;

        if (uploadedImageUrl) {
          checkIn.photoUrl = uploadedImageUrl;
        }

        checkIn.set("updatedAt", now);
      }

      await checkIn.save();
    } else {
      // Create new document
      checkIn = await CheckIn.create({
        user: userId,
        photoUrl: uploadedImageUrl || null,
        location: { lat, long },
      });
    }

    return res.status(200).json({
      message: "Check-in recorded",
      checkIn: {
        createdAt: checkIn.createdAt,
        updatedAt: checkIn.updatedAt,
        photoUrl: checkIn.photoUrl || null,
        location: checkIn.location,
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

const checkOut = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id;
  const { lat, long } = req.body;

  // Define today's date range
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  let uploadedImageUrl: "";

  // Optional image upload
  if (req.file && req.file.buffer) {
    const imgUpload = await uploadToCloudinary(req.file.buffer);

    if (!imgUpload)
      return res.status(400).json({ message: "Image upload failed" });

    uploadedImageUrl = imgUpload.secure_url;
  }

  // Check if today's checkout already exists
  let checkOut = await CheckOut.findOne({
    user: userId,
    createdAt: { $gte: startOfToday, $lte: endOfToday },
  });

  const now = new Date();

  if (checkOut) {
    // Compare existing data
    const sameLat = Number(checkOut.location.lat) === Number(lat);
    const sameLong = Number(checkOut.location.long) === Number(long);
    const samePhoto =
      !uploadedImageUrl || uploadedImageUrl === checkOut.photoUrl;

    const isSameData = sameLat && sameLong && samePhoto;

    if (isSameData) {
      // Refresh timestamps only
      checkOut.set("updatedAt", now);
    } else {
      // Update changed fields
      checkOut.location.lat = lat;
      checkOut.location.long = long;

      if (uploadedImageUrl) {
        checkOut.photoUrl = uploadedImageUrl;
      }

      checkOut.set("updatedAt", now);
    }

    await checkOut.save();
  } else {
    // Create a new checkout record
    checkOut = await CheckOut.create({
      user: userId,
      photoUrl: uploadedImageUrl || null,
      location: { lat, long },
    });
  }

  return res.status(200).json({
    message: "Checkout recorded",
    checkOut: {
      createdAt: checkOut.createdAt,
      updatedAt: checkOut.updatedAt,
      photoUrl: checkOut.photoUrl || null,
      location: checkOut.location,
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

  // Update user's location in the database
  const updatedLocation = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { latitude, longitude },
    },
    {
      new: true,
    }
  ).select("-refreshToken -password");

  if (!updatedLocation)
    return res.status(400).json({ message: "Location couldn't be updated" });

  return res
    .status(200)
    .json({ message: "Location updated successfully", updatedLocation });
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
};
