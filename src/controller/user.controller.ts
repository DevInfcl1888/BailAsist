import express, { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Status } from "../models/bondsman.model.js"; // enums
import {
  isDateValid,
  isValidData,
  isValidEmail,
  isValidPassword,
  isValidPhone,
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
} from "../models/user.model.js";
import { Bondsman, CheckIn, Court } from "../models/bondsman.model.js";
import { generateOTP, sendOTPfun, otpStore } from "../utils/OTPsender.js";
import bcrypt from "bcryptjs";
import { uploadToCloudinary } from "../utils/cloudinary.js";

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
    console.log("k", isValidEmail(email));
    return res.status(404).json({ message: "Invalid email" });
  }
  if (!isValidPassword(password) || !isValidPassword(confirmPassword))
    return res.status(401).json({
      message:
        "Password must contain at least 1 uppercase, lowercase, number, and special character, and password should be upto 8 characters long",
    });
  if (!isValidPhone(phoneNo)) {
    return res.status(404).json({ message: "Invalid phone no." });
  }
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
    return res.status(401).json({ message: "Credentials are missing" });

  if (!isValidEmail(email))
    return res.status(404).json({ message: "Invalid email" });

  if (!isValidPassword(password))
    return res.status(401).json({ message: "Invalid password" });

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
  if (!isValidPhone(phoneNo)) {
    return res.status(404).json({ message: "Invalid phone no." });
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
        email: data.email,
        phoneNo: data.phoneNo,
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
  // generate OTP
  const generate_OTP: string = await generateOTP(email);

  const send_OTP: string = await sendOTPfun(email, generate_OTP);

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
  // console.log("stored", stored);

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
    return res.status(200).json({ message: "user still login" });
  }
}; // This is only for checking that user still logged in or not

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
  const { yearsAtCurrentAddress, landlordName, landlordAddress } = req.body as {
    yearsAtCurrentAddress: string;
    landlordName: string;
    landlordAddress: string;
  };
  const { residenceId } = req.body;
  if (
    !yearsAtCurrentAddress.trim() ||
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
    residenceInfo,
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
  if (!isValidPhone(phoneNo))
    return res.status(400).json({ message: "Invalid phone" });
  const user = await User.findById(req.user?._id);
  if (!user) return res.status(404).json({ message: "User not found" });
  const data = {
    user: req.user?._id,
    firstName,
    middleName,
    lastName,
    email,
    phoneNo,
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
    contactInfo,
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
  if (!isValidPhone(attorneyPhoneNo))
    return res.status(400).json({ message: "Phone no is Invalid" });
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
    legalInfo,
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
    Description,
  } = req.body;

  const { personalInfoId } = req.body;
  console.log("this is personalInfoId", personalInfoId);

  let responsibleDescription = "";
  if (isResponsible && !Description) {
    return res
      .status(400)
      .json({ message: "Please provide details of dependents" });
  }
  if (isResponsible) responsibleDescription = Description;

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
    personalInfo,
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
    bikeNumberPlate,
    automobikeModel,
  } = req.body as {
    socialSecurityNumber: String;
    state: String;
    drivingLicenseNo: String;
    havingYourOwnAutomobile: boolean; //  if yes then fill further info
    automobikeColor: String;
    automobikeMake: String;
    bikeNumberPlate: String;
    automobikeModel: String;
  };
  const { driverLicId } = req.body;
  if (!socialSecurityNumber.trim() || !state.trim() || !drivingLicenseNo.trim())
    return res.status(404).json({ message: "Required fields can't be empty" });
  const data = {
    user: req.user?._id,
    socialSecurityNumber,
    state,
    drivingLicenseNo,
    havingYourOwnAutomobile, //  if yes then fill further info
    automobikeColor: havingYourOwnAutomobile ? automobikeColor : " ",
    automobikeMake: havingYourOwnAutomobile ? automobikeMake : " ",
    bikeNumberPlate: havingYourOwnAutomobile ? bikeNumberPlate : " ",
    automobikeModel: havingYourOwnAutomobile ? automobikeModel : " ",
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
    driversLicInfo,
    accessToken: accessToken,
    refreshToken: refreshToken,
  });
});

const addPersonalRefrenceInfo = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      otherFamilyMemberName_1,
      otherFamilyMemberAddress_1,
      otherFamilyMemberPhoneNo_1,
      knownDuration_1,
      otherFamilyMemberName_2,
      otherFamilyMemberAddress_2,
      otherFamilyMemberPhoneNo_2,
      knownDuration_2,
      otherFamilyMemberName_3,
      otherFamilyMemberAddress_3,
      otherFamilyMemberPhoneNo_3,
      knownDuration_3,
    } = req.body as {
      otherFamilyMemberName_1: string;
      otherFamilyMemberAddress_1: string;
      otherFamilyMemberPhoneNo_1: string;
      knownDuration_1: string;
      otherFamilyMemberName_2: string;
      otherFamilyMemberAddress_2: string;
      otherFamilyMemberPhoneNo_2: string;
      knownDuration_2: string;
      otherFamilyMemberName_3: string;
      otherFamilyMemberAddress_3: string;
      otherFamilyMemberPhoneNo_3: string;
      knownDuration_3: string;
    };
    const { personalRefId } = req.body;
    if (
      !otherFamilyMemberName_1.trim() ||
      !otherFamilyMemberAddress_1.trim() ||
      !otherFamilyMemberPhoneNo_1.trim() ||
      !knownDuration_1.trim() ||
      !otherFamilyMemberName_2.trim() ||
      !otherFamilyMemberAddress_2.trim() ||
      !otherFamilyMemberPhoneNo_2.trim() ||
      !knownDuration_2.trim() ||
      !otherFamilyMemberName_3.trim() ||
      !otherFamilyMemberAddress_3.trim() ||
      !otherFamilyMemberPhoneNo_3.trim() ||
      !knownDuration_3.trim()
    )
      return res
        .status(404)
        .json({ message: "Required fields can't be empty" });
    if (
      !isValidData(otherFamilyMemberName_1) ||
      !isValidData(otherFamilyMemberName_2) ||
      !isValidData(otherFamilyMemberName_3)
    )
      return res.status(400).json({ message: "Invalid name" });
    if (
      !isValidPhone(otherFamilyMemberPhoneNo_1) ||
      !isValidPhone(otherFamilyMemberPhoneNo_2) ||
      !isValidPhone(otherFamilyMemberPhoneNo_3)
    )
      return res.status(400).json({ message: "Invalid phone" });

    const data = {
      user: req.user?._id,
      otherFamilyMemberName_1,
      otherFamilyMemberAddress_1,
      otherFamilyMemberPhoneNo_1,
      knownDuration_1: `${knownDuration_1} Yr`,
      otherFamilyMemberName_2,
      otherFamilyMemberAddress_2,
      otherFamilyMemberPhoneNo_2,
      knownDuration_2: `${knownDuration_2} Yr`,
      otherFamilyMemberName_3,
      otherFamilyMemberAddress_3,
      otherFamilyMemberPhoneNo_3,
      knownDuration_3: `${knownDuration_3} Yr`,
    };

    let personalRefDoc;
    const user = await User.findById(req.user?._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (personalRefId) {
      personalRefDoc = await personalRefrenceInfo.findByIdAndUpdate(
        personalRefId,
        { $set: data },
        { new: true }
      );

      if (!personalRefDoc)
        return res.status(401).json({ message: "Data not found or update" });
    } else {
      personalRefDoc = await personalRefrenceInfo.findOneAndUpdate(
        { user: req.user?._id }, // find existing record for user
        { $set: data },
        { new: true, upsert: true } // create if not found
      );
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    if (!personalRefDoc)
      return res.status(500).json({ message: "Internal Server error" });
    return res.status(200).json({
      message: personalRefId
        ? "Updated successfully"
        : "Data save successfully",
      accessToken: accessToken,
      refreshToken: refreshToken,
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
      personalRefInfo,
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
      employementStatus: boolean; // if yes then fill further info
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
      employerName: employementStatus ? employerName : " ",
      employerSupervisorName: employementStatus ? employerSupervisorName : " ",
      employerAddress: employementStatus ? employerAddress : " ",
      employerWorkingPeriod: employementStatus
        ? `${employerWorkingPeriod} Yr`
        : " ",
      automobileColor: employementStatus ? automobileColor : " ",
      previousEmployer: employementStatus ? previousEmployer : " ",
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
      employementInfo,
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  }
);

// you can filter your upcoming check-in dates and missed check-in dates and their status
const getCheckInStatus = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.body;
  if (!date || !isDateValid(date))
    return res
      .status(400)
      .json({ message: "Date should be in YYYY-MM-DD formate" });
  const checkInDate = new Date(date);
  const startOfDay = new Date(checkInDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(checkInDate.setHours(23, 59, 59, 999));

  const isCheckInRecordExist = await CheckIn.findOne({
    user: req.user?._id,
    "nextCheckInDate.date": {
      $gte: startOfDay,
      $lte: endOfDay,
    },
    isActive: true,
  }).populate("user", "_id firstName middleName lastName phoneNo emai");
  if (!isCheckInRecordExist)
    return res.status(404).json({
      message: "No Record found on this date.",
    });
  return res.status(200).json({
    message: "Check-in found",
    isCheckInRecordExist,
  });
});

const getUserBondsmanInfo = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const isBondsmanExist = await User.findById(userId)
      .populate("bondsman", "name phoneNo email")
      .select("-password -refreshToken");
    if (!isBondsmanExist)
      return res.status(404).json({ message: "User not found" });
    return res
      .status(200)
      .json({ message: "Bondsman Information", isBondsmanExist });
  }
);

// User Check-In Here
const checkIn = asyncHandler(async (req: Request, res: Response) => {
  const { checkIn_Id } = req.params;
  const { message, location } = req.body as {
    message?: string;
    location?: string;
  };
  if (!checkIn_Id)
    return res.status(404).json({ message: "Check-in Id not found" });

  let isCheckInExist = await CheckIn.findOne({
    _id: checkIn_Id,
    isActive: true,
  });

  if (!isCheckInExist)
    return res.status(404).json({ message: "No check-In found" });

  const date = new Date();
  const nextCheckInDate = new Date(isCheckInExist.lastCheckedInAt.date);
  if (nextCheckInDate > date)
    return res.status(401).json({ message: "Today is not your check-in date" });

  if (
    nextCheckInDate.toDateString() !== date.toDateString() &&
    nextCheckInDate < date
  ) {
    return res.status(401).json({
      message: "You missed your check-in date.",
      nextCheckInDate,
    });
  }
  if (!location)
    return res.status(404).json({ message: "Location is invalid or missing" });
  const uploads = await uploadToCloudinary(req.file?.buffer!);
  if (!uploads)
    return res.status(401).json({ message: "error during upload img" });
  const checkInRecord = await CheckIn.findByIdAndUpdate(
    checkIn_Id,
    {
      $set: {
        "lastCheckedInAt.status": Status.Done,
        "checkInProof.photoUrl": uploads.secure_url,
        "checkInProof.userId": req.user?._id,
        "checkInProof.message": message || "",
        "checkInProof.location": location,
      },
    },
    {
      new: true,
    }
  ).populate("user", "_id firstName middleName lastName phoneNo");
  // console.log("checkInRecord", checkInRecord);
  // const checkInProof= await CheckInProof.findByIdAndUpdate()
  if (!checkInRecord)
    return res
      .status(403)
      .json({ message: "Check-in couldn't complete! try again..." });

  // let data = checkInRecord.checkInProof;
  return res.status(200).json({
    message: "Check-in successful",
    checkInRecord,
  });
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

const status = (req: Request, res: Response) => {
  return res.status(200).json({ message: "success" });
};
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
  getCheckInStatus,
  getUserBondsmanInfo,
  checkIn,
  updateAddressAndSendPictureAsProof,
  updateLatAndLong,
  getResidenceInfo,
  getContactInfo,
  getLegalInfo,
  getPersonalInfo,
  getDriverLicInfo,
  getPersonalRefrenceInfo,
  getEmployementStatus,
  status,
};
