import { Request, Response } from "express";
import HomeScreenModel, { Status } from "../models/homeScreen.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  isValidEmail,
  isValidPassword,
  isValidPhone,
} from "../utils/dataValidators.js";
import { User } from "../models/user.model.js";

const { Bondsman, CheckIn, Court, CheckInProof } = HomeScreenModel;

const signUpAsBondsman = asyncHandler(async (req: Request, res: Response) => {
  const { BondsmanName, phoneNo, password, email, deviceToken, countryCode } =
    req.body as {
      BondsmanName: string;
      phoneNo: string;
      password: string;
      email: string;
      deviceToken: string;
      countryCode: string;
    };
  if (!BondsmanName.trim() || !phoneNo.trim() || !password.trim())
    return res.status(400).json({ Message: "All fields are required" });
  if (!isValidPhone(phoneNo))
    return res.status(400).json({ Message: "Invalid phone number" });
  if (!isValidEmail(email))
    return res.status(400).json({ Message: "Invalid email" });
  if (!isValidPassword(password))
    return res.status(401).json({
      Message:
        "Password must contain at least 1 uppercase, lowercase, number, and special character, and password should be upto 8 characters long",
    });

  const isBondsmanExist = await Bondsman.findOne({
    email: { $regex: new RegExp(`^${email}$`, "i") },
  });
  if (isBondsmanExist)
    return res
      .status(409)
      .json({ Message: "Account already registered with this creadentials" });

  const createBondsman = await Bondsman.create({
    name: BondsmanName,
    phoneNo,
    password,
    email,
    deviceToken: deviceToken ? deviceToken : " ",
    countryCode,
  });
  const accessToken = createBondsman.generateAccessToken();

  const isCreatedBondsmanSuccessFully = await Bondsman.findById(
    createBondsman?._id
  ).select("-password -refreshToken");
  if (!isCreatedBondsmanSuccessFully)
    return res.status(500).json({ Message: "Failed to create Bondsman" });
  return res.status(201).json({
    Message: "Bondsman created successfully",
    Bondsman: { isCreatedBondsmanSuccessFully, accessToken: accessToken },
  });
});

const loginAsBondsman = asyncHandler(async (req: Request, res: Response) => {
  const { phone, password, deviceToken } = req.body as {
    phone: string;
    password: string;
    deviceToken?: string;
  };
  if (!phone || !password)
    return res.status(404).json("Login can't complete without creadentials");
  if (!isValidPhone(phone))
    return res.status(400).json({ Message: "Invalid Phone no." });
  const isExistBondsman = await Bondsman.findOne({ phoneNo: phone });
  if (!isExistBondsman)
    return res
      .status(404)
      .json({ Message: "Bondsman not exist. Kindly signUp first" });
  const isMatchPassword = await isExistBondsman.isCorrectPassword(password);
  if (!isMatchPassword)
    return res.status(401).json({ Message: "Wrong Password" });

  const accessToken = isExistBondsman.generateAccessToken();
  const refreshToken = isExistBondsman.generateRefreshToken();

  const updateData: any = {
    refreshToken: refreshToken,
    deviceToken: deviceToken || "",
  };

  const isExistingBondsmanUpdate = await Bondsman.findByIdAndUpdate(
    isExistBondsman?._id,
    {
      $set: updateData,
    },
    {
      new: true,
      validateBeforeSave: false,
    }
  ).select("-password");

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
      Message: "Bondsman login successfully",
      data: {
        isExistBondsman: isExistingBondsmanUpdate,
        accessToken: `${accessToken}`,
        deviceToken: deviceToken ? deviceToken : "",
      },
    });
});

// Create Check-in
const creatCheckIn = asyncHandler(async (req: Request, res: Response) => {
  const { day } = req.body as { day: number };
  const { userId } = req.params;
  if (!day)
    return res.status(400).json({
      Message: "Please set next check-in day interval (e.g. 7 (in days))",
    });

  // Find the user's check-in record
  let bondsman = await Bondsman.findOne({ _id: req.user?._id });
  // console.log("bondsman", bondsman);
  if (!bondsman) return res.status(404).json({ Message: "Bondsman not found" });

  let user = await User.findOne({ _id: userId });
  // console.log("user", user);
  if (!user) return res.status(404).json({ Message: "User not found" });

  const checkInRecord = await CheckIn.create({
    user: user?._id,
    lastCheckedInAt: {
      date: new Date(),
      status: Status.Pending,
    },
    nextCheckInDate: {
      date: new Date(Date.now() + day * 24 * 60 * 60 * 1000),
      status: Status.Pending,
    },
  });
  if (!checkInRecord)
    return res.status(403).json({ Message: "Error during create check-in" });

  const formattedLastCheckIn = new Date(
    checkInRecord.lastCheckedInAt.date!
  ).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const formattedNextCheckIn = new Date(
    checkInRecord.nextCheckInDate.date!
  ).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  // console.log("cheackIn", checkInRecord);

  return res.status(200).json({
    Message: "Check-in successful",
    lastCheckIn: {
      date: formattedLastCheckIn,
      status: checkInRecord.lastCheckedInAt.status,
    },
    nextCheckIn: {
      date: formattedNextCheckIn,
      status: checkInRecord.nextCheckInDate.status,
    },
  });
});

const searchByPhoneNumber = asyncHandler(
  async (req: Request, res: Response) => {
    const { phone } = req.query;
    if (!phone)
      return res
        .status(404)
        .json({ Message: "Search bar expect phone no for searching" });
    const searchedUser = await User.find({
      phoneNo: { $regex: phone, $options: "i" },
    }).select("-password");
    if (!searchedUser)
      return res.status(404).json({ Message: "No result found" });
    return res.status(200).json({
      Message:
        searchedUser.length === 0
          ? "No data found while searching"
          : "Searching finish",
      searchedUser,
    });
  }
);

const deleteCheckIn = asyncHandler(async (req: Request, res: Response) => {
  const { checkIn_Id } = req.params;
  if (!checkIn_Id) return res.status(400).json({ Message: "Invalid _id" });
  const isDeletedCheckIn = await CheckIn.deleteOne({ _id: checkIn_Id });
  console.log("isDeleteCheckIn", isDeletedCheckIn);
  if (!isDeletedCheckIn.acknowledged)
    return res.status(401).json({ Message: "Deletion couldn't be complete" });
  return res
    .status(200)
    .json({ Message: "Delete Successfully", isDeletedCheckIn });
});

// const getRecentCheckedInByUser = asyncHandler(
//   async (req: Request, res: Response) => {
//     const { userId } = req.params;
//     if (!userId) return res.status(400).json({ Message: "User not found" });

//     const proof = await CheckIn.find({ userId })
//       .sort({ createdAt: -1 })
//       .populate([
//         {
//           path: "user",
//           select:
//             "firstName middleName lastName email phoneNo isActive homeAddress image",
//         },
//       ]);
//     console.log(proof);
//     console.log(proof.length !== 0);

//     if (proof.length === 0 || !proof)
//       return res
//         .status(400)
//         .json({ Message: "No Check-in found of this user" });

//     const formattedData = proof.map((data) => {
//       user: data.user;
//       photoUrl: data.photoUrl;
//       message: data.message;
//       location: data.location;
//       date: new Date(data.createdAt).toLocaleString("en-GB", {
//         day: "2-digit",
//         month: "short",
//         year: "numeric",
//         hour: "2-digit",
//         minute: "2-digit",
//         second: "2-digit",
//       });
//     });
//     return res.status(200).json({
//       Message: "Check-in history fetched successfully",
//       total: proof.length,
//       data: formattedData,
//     });
//   }
// );

export {
  signUpAsBondsman,
  creatCheckIn,
  loginAsBondsman,
  searchByPhoneNumber,
  deleteCheckIn
  // getRecentCheckedInByUser,
};
