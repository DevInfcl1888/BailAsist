import express, { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  isValidData,
  isValidEmail,
  isValidPassword,
  isValidPhone,
} from "../utils/dataValidators.js";
import {
  ResidenceType,
  ResidenceInfo,
  LegalInfo,
  User,
  ContactInfo,
  // RACE,
  // GENDER,
  // EYE_COLOR,
  // HAIR_COLOR,
  // MARITAL_STATUS,
  // PersonalInfo,
} from "../models/user.model.js";
import { generateOTP, sendOTPfun, otpStore } from "../utils/OTPsender.js";
import bcrypt from "bcryptjs";

const registration = asyncHandler(async (req: Request, res: Response) => {
  const {
    firstName,
    middleName,
    lastName,
    email,
    password,
    phoneNo,
    homeAddress,
    street,
    deviceToken,
    ZipCode,
    isAgreed,
  } = req.body as {
    firstName: string;
    middleName: string;
    lastName: string;
    email: string;
    password: string;
    phoneNo: string;
    deviceToken?: string;
    homeAddress: string;
    street: string;
    ZipCode: string;
    isAgreed: boolean;
  };
  // Data validation
  if (
    !firstName?.trim() ||
    !middleName?.trim() ||
    !lastName?.trim() ||
    !email?.trim() ||
    !password?.trim() ||
    !phoneNo?.trim() ||
    !homeAddress?.trim() ||
    !street?.trim() ||
    !ZipCode?.trim() ||
    isAgreed === false
  ) {
    return res.status(400).json({ msg: "All credentials are required" });
  }
  if (!isValidEmail(email)) {
    console.log("k", isValidEmail(email));
    return res.status(404).json({ message: "Invalid email" });
  }
  if (!isValidPassword(password))
    return res.status(401).json({
      message:
        "Password must contain at least 1 uppercase, lowercase, number, and special character, and password should be upto 8 characters long",
    });
  if (phoneNo.length !== 10 || !isValidPhone(phoneNo)) {
    return res.status(404).json({ message: "Invalid phone no." });
  }
  if (homeAddress.length < 10 || homeAddress.length > 100)
    return res.status(400).json({
      Message: "Home address must be between 10 and 100 characters long.",
    });
  if (street.length > 100 || ZipCode.length > 11)
    return res.status(400).json({ Message: "Street or ZIP code is too long" });

  const checkUserExistence = await User.findOne({
    email,
  });

  if (checkUserExistence)
    return res.status(403).json({ message: "User already exist" });

  // User created
  const createdUser = await User.create({
    firstName,
    middleName,
    lastName,
    email,
    password,
    phoneNo,
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
  console.log("isUserRegisteredSuccessFully", isUserRegisteredSuccessFully);

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

  // check user existence
  const user = await User.findOne({ email: email });
  console.log(user);

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

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const expiresIn = rememberMe ? 10 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000; // 10 Days or 15 mins
  // sending response
  return res
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      maxAge: expiresIn, // 10 Days or 15 min
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    })
    .status(200)
    .json({
      message: "User login successfully",
      user: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(),
      accessToken: `${accessToken}`,
      refreshToken: `${refreshToken}`,
      deviceToken: deviceToken ? deviceToken : "",
      email: user?.email,
    });
});

const logout = asyncHandler(async (req: Request, res: Response) => {
  // Extract refresh token from cookies
  const { refreshToken } = req.cookies;

  if (!refreshToken)
    return res.status(404).json({ message: "No refresh token found" });

  // Step 1: Remove refresh token from DB (by matching token)
  const user = await User.findOne({ refreshToken: refreshToken });

  if (user) {
    // Step 2: Clear refreshToken in DB
    user.refreshToken = "";
    await user.save({ validateBeforeSave: false });
  }

  // Step 3: Clear cookies from browser
  res.clearCookie("accessToken", { httpOnly: true, secure: true });
  res.clearCookie("refreshToken", { httpOnly: true, secure: true });

  // Step 4: Return response
  return res.status(200).json({
    message: "User logged out successfully",
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
    firstName,
    middleName,
    lastName,
    email,
    phoneNo,
    // homeAddress,
    street,
    ZipCode,
  } = req.body as {
    firstName: string;
    middleName: string;
    lastName: string;
    email: string;
    phoneNo: string;
    // homeAddress: string;
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
    // !homeAddress?.trim() ||
    !street?.trim() ||
    !ZipCode?.trim()
  ) {
    return res.status(400).json({ msg: "All credentials are required" });
  }
  if (!isValidEmail(email)) {
    console.log("k", isValidEmail(email));
    return res.status(404).json({ message: "Invalid email" });
  }
  if (phoneNo.length !== 10 || !/^\d{10}$/.test(phoneNo)) {
    return res.status(404).json({ message: "Invalid phone no." });
  }
  // if (homeAddress.length < 10 || homeAddress.length > 100)
  //   return res.status(400).json({
  //     Message: "Home address must be between 10 and 100 characters long.",
  //   });
  if (street.length > 100 || ZipCode.length > 11)
    return res.status(400).json({ Message: "Street or ZIP code is too long" });

  const user = await User.findById(req.user?._id);
  if (!user)
    return res
      .status(404)
      .json({ Message: "User not found or maybe you logout" });

  let data = {
    firstName,
    middleName,
    lastName,
    email,
    phoneNo,
    // homeAddress,
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
        // "signUp.homeAddress": data.homeAddress,
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
  // console.log("generate_OTP", generate_OTP);

  const send_OTP: string = await sendOTPfun(email, generate_OTP);
  // console.log("send_OTP", send_OTP);

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
    return res.status(200).json({ msg: "user still login" });
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
  return res
    .status(200)
    .clearCookie("accessToken", { httpOnly: true, secure: true })
    .clearCookie("refreshToken", { httpOnly: true, secure: true })
    .json({
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
  const {
    yearsAtCurrentAddress,
    residenceType,
    landlordName,
    landlordAddress,
  } = req.body as {
    yearsAtCurrentAddress: string;
    residenceType: ResidenceType;
    landlordName: string;
    landlordAddress: string;
  };
  if (
    !yearsAtCurrentAddress.trim() ||
    !landlordName.trim() ||
    !landlordAddress.trim()
  ) {
    return res.status(404).json({ Message: "Fields can't be empty" });
  }
  if (!Object.values(ResidenceType).includes(residenceType)) {
    return res.status(400).json({
      success: false,
      message: `Invalid residence type. Must be one of: ${Object.values(
        ResidenceType
      ).join(", ")}`,
    });
  }
  if (!isValidData(landlordName))
    return res
      .status(400)
      .json({ Message: "Invalid landlord name. please use only alphabets" });
  const residenceInfoCreate = await ResidenceInfo.create({
    yearsAtCurrentAddress: `${yearsAtCurrentAddress} Yr`,
    residenceType,
    landlordName,
    landlordAddress,
  });
  const { accessToken, refreshToken } = req.cookies;

  const isResidenceInfoExist = await ResidenceInfo.findById(
    residenceInfoCreate?._id
  );
  if (!isResidenceInfoExist)
    return res.status(500).json({ Message: "Error occur during submit data." });

  return res.status(200).json({
    Message: "Data save successfully",
    isResidenceInfoExist,
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
  if (
    !firstName.trim() ||
    !middleName.trim() ||
    !lastName.trim() ||
    !email.trim() ||
    !phoneNo.trim()
  )
    return res.status(404).json({ Message: "All fields are required" });

  if (
    !isValidData(firstName) ||
    !isValidData(middleName) ||
    !isValidData(lastName)
  )
    return res.status(400).json({
      Message:
        "firstName, middleName or lastName has invalid type. please include only alphabets and length should be more then 3 char ",
    });
  if (!isValidEmail(email))
    return res.status(400).json({ Message: "Invalid email" });
  if (!isValidPhone(phoneNo))
    return res.status(400).json({ Message: "Invalid phone" });

  const { accessToken, refreshToken } = req.cookies;

  const contactInfoCreate = await ContactInfo.create({
    firstName,
    middleName,
    lastName,
    email,
    phoneNo,
  });

  const isContactInfoCreate = await ContactInfo.findById(
    contactInfoCreate?._id
  );
  if (!isContactInfoCreate)
    return res.status(500).json({ Message: "Error occur during submit data." });

  return res.status(200).json({
    Message: "Contact info saved",
    isContactInfoCreate,
    accessToken: accessToken,
    refreshToken: refreshToken,
  });
  // ContactInfo
});

const addLegalInfo = asyncHandler(async (req: Request, res: Response) => {
  const { attorneyName, attorneyAddress, attorneyPhoneNo } = req.body as {
    attorneyName: string;
    attorneyAddress: string;
    attorneyPhoneNo: string;
  };
  if (
    !attorneyName.trim() ||
    !attorneyAddress.trim() ||
    !attorneyPhoneNo.trim()
  )
    return res.status(404).json({ Message: "Fields can't be empty" });
  if (!isValidData(attorneyName))
    return res.status(400).json({
      Message:
        "Invalid attorney name. please use only alphabets and it should be more then 3 charater",
    });
  if (!isValidPhone(attorneyPhoneNo))
    return res.status(400).json({ Message: "Phone no is Invalid" });
  const { accessToken, refreshToken } = req.cookies;
  const legalInfoCreate = await LegalInfo.create({
    attorneyName,
    attorneyAddress,
    attorneyPhoneNo,
  });
  const isLegalInfoCreate = await LegalInfo.findById(legalInfoCreate?._id);
  if (!isLegalInfoCreate)
    return res.status(500).json({ Message: "Internal server error." });
  return res.status(200).json({
    Message: "Data submitted",
    isLegalInfoCreate,
    accessToken,
    refreshToken,
  });
});

// const addPersonalInfo = asyncHandler(async (req: Request, res: Response) => {
//   const {
//     weight,
//     height,
//     race,
//     gender,
//     eyeColor,
//     hairColor,
//     birthPlace,
//     birthDate,
//     UScitizen,
//     nickname,
//     maritalStatus,
//     spouseName,
//     spouseOccupation,
//     spouseEmployer, // The name of the company where your husband or wife works.
//     items,
//     isResponsible, // Responsible for anyone else support
//     dependents,
//   } = req.body as {
//     weight: string;
//     height: string;
//     race: RACE;
//     gender: GENDER;
//     eyeColor: EYE_COLOR;
//     hairColor: HAIR_COLOR;
//     birthPlace: string;
//     birthDate: string;
//     UScitizen: boolean;
//     nickname: string;
//     maritalStatus: MARITAL_STATUS;
//     spouseName: string;
//     spouseOccupation: string;
//     spouseEmployer: string; // The name of the company
//     items?: { childName: string; childAge: string; childSchool: string }[];
//     isResponsible: boolean; // Responsible for anyone else support
//     dependents: string;
//   };
//   if (
//     !weight.trim() ||
//     !height.trim() ||
//     !birthPlace.trim() ||
//     !birthDate.trim() ||
//     !nickname.trim()
//   )
//     return res.status(404).json({ Message: "Required field missing" });

//   if (!Object.values(RACE).includes(race)) {
//     return res.status(400).json({
//       success: false,
//       message: `Invalid race type. Must be one of: ${Object.values(RACE).join(
//         ", "
//       )}`,
//     });
//   }
//   if (!Object.values(GENDER).includes(gender)) {
//     return res.status(400).json({
//       success: false,
//       message: `Invalid gender type. Must be one of: ${Object.values(
//         GENDER
//       ).join(", ")}`,
//     });
//   }
//   if (!Object.values(EYE_COLOR).includes(eyeColor)) {
//     return res.status(400).json({
//       success: false,
//       message: `Invalid eye color type. Must be one of: ${Object.values(
//         EYE_COLOR
//       ).join(", ")}`,
//     });
//   }
//   if (!Object.values(HAIR_COLOR).includes(hairColor)) {
//     return res.status(400).json({
//       success: false,
//       message: `Invalid hair color type. Must be one of: ${Object.values(
//         HAIR_COLOR
//       ).join(", ")}`,
//     });
//   }
//   if (!Object.values(MARITAL_STATUS).includes(maritalStatus)) {
//     return res.status(400).json({
//       success: false,
//       message: `Invalid marital status type. Must be one of: ${Object.values(
//         MARITAL_STATUS
//       ).join(", ")}`,
//     });
//   }

//   let content: string = " ";
//   if (isResponsible) {
//     content = dependents;
//   }
//   const { accessToken, refreshToken } = req.cookies;

//   const personalInfoCreate = await PersonalInfo.create({
//     weight,
//     height,
//     race,
//     gender,
//     eyeColor,
//     hairColor,
//     birthPlace,
//     birthDate,
//     UScitizen,
//     nickname,
//     maritalStatus,
//     spouseName: spouseName ? spouseName : " ",
//     spouseOccupation: spouseOccupation ? spouseOccupation : "",
//     spouseEmployer: spouseEmployer ? spouseEmployer : " ",
//     isResponsible, // Responsible for anyone else support
//     dependents: content,
//   });

//   console.log("personalInfoCreate",personalInfoCreate);

//   const isPersonalInfoCreate = await PersonalInfo.findOne({
//     _id: personalInfoCreate?._id,
//   });
// console.log("personalInfoCreate",isPersonalInfoCreate);

//   if (isPersonalInfoCreate) {
//     if (items) {
//       console.log("...items",...items);
//       console.log("items",items);
      
//       isPersonalInfoCreate.child?.push(...items);
//       await isPersonalInfoCreate.save();
//     }
//   }

//   if (!isPersonalInfoCreate)
//     return res.status(500).json({ Message: "Internal server error" });


//   return res.status(200).json({
//     Message: "Data submitted",
//     isPersonalInfoCreate,
//     accessToken: accessToken,
//     refreshToken: refreshToken,
//   });
// });

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
  // addPersonalInfo,
};
