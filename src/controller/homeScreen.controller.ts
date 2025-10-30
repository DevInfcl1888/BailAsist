import { Request, Response } from "express";
import HomeScreenModel from "../models/homeScreen.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Status } from "../models/homeScreen.model.js";
import { isDateValid } from "../utils/dataValidators.js";
import { courtTypes, courtLevel } from "../models/homeScreen.model.js";
import {
  isValidEmail,
  isValidPhone,
  isValidData,
} from "../utils/dataValidators.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const { Agency, CheckIn, Court } = HomeScreenModel; // Models

// Create Check-in
const creatCheckIn = asyncHandler(async (req: Request, res: Response) => {
  const { day } = req.body as { day: number };
  if (!day)
    return res.status(404).json({
      Message: "Please set next check-in day interval (e.g. 7 (in days))",
    });

  // Find the user's check-in record
  let user = await User.findOne({ _id: req.user?._id });
  console.log("user", user);

  if (!user) return res.status(404).json({ msg: "User not found" });

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
    return res
      .status(403)
      .json({ Message: "Check-in couldn't complete! try again..." });

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
  console.log("cheackIn", checkInRecord);

  return res.status(200).json({
    msg: "Check-in successful",
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

const getUserAgencyInfo = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const isUserExist = await User.findById(userId).populate([
    {
      path: "agency",
      select: "name phoneNo email agentName address",
    },
  ]);
  if (!isUserExist) return res.status(404).json({ message: "User not found" });
  return res.status(200).json({ Message: "Agency Information", isUserExist });
});

// you can filter your upcoming check-in dates and missed check-in dates and their status
const getCheckInStatus = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.body;
  if (!date || !isDateValid(date))
    return res
      .status(400)
      .json({ Message: "Date should be in YYYY-MM-DD formate" });
  const checkInDate = new Date(date);
  const startOfDay = new Date(checkInDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(checkInDate.setHours(23, 59, 59, 999));

  const isCheckInRecordExist = await CheckIn.findOne({
    user: req.user?._id,
    "nextCheckInDate.date": {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });
  // console.log("isCheckInRecordExist", isCheckInRecordExist);
  if (!isCheckInRecordExist)
    return res.status(404).json({
      Message: "No Record found on this date.",
    });
  const formattedNextCheckIn = new Date(
    isCheckInRecordExist.nextCheckInDate.date!
  ).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const formattedLastCheckIn = new Date(
    isCheckInRecordExist.lastCheckedInAt.date!
  ).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return res.status(200).json({
    message: "Check-in found",
    nextCheckInDate: formattedNextCheckIn,
    nextCheckInstatus: isCheckInRecordExist.nextCheckInDate.status,
    lastCheckInDate: formattedLastCheckIn,
    lastCheckInStatus: isCheckInRecordExist.lastCheckedInAt.status,
  });
});

// Check-In Here
const checkIn = asyncHandler(async (req: Request, res: Response) => {
  const { checkIn_Id } = req.params;
  const { message, location } = req.body as {
    message?: string;
    location: string;
  };
  if (!checkIn_Id)
    return res.status(404).json({ Message: "Check-in Id not found" });

  let isCheckInExist = await CheckIn.findOne({ _id: checkIn_Id });

  if (!isCheckInExist)
    return res.status(404).json({ msg: "No check-In found" });

  const date = new Date();
  const nextCheckInDate = new Date(isCheckInExist.lastCheckedInAt.date);
  if (nextCheckInDate > date)
    return res.status(401).json({ Message: "Today is not your check-in date" });

  if (
    nextCheckInDate.toDateString() !== date.toDateString() &&
    nextCheckInDate < date
  ) {
    return res.status(401).json({
      Message: "You missed your check-in date.",
      nextCheckInDate,
    });
  }
  if (!location)
    return res.status(404).json({ Message: "Location is invalid or missing" });
  const uploads = await uploadToCloudinary(req.file?.buffer!);
  if (!uploads)
    return res.status(401).json({ Message: "error during upload img" });
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
  );
  console.log("checkInRecord", checkInRecord);

  if (!checkInRecord)
    return res
      .status(403)
      .json({ Message: "Check-in couldn't complete! try again..." });

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

  return res.status(200).json({
    msg: "Check-in successful",
    lastCheckIn: {
      lastCheckIn: formattedLastCheckIn,
      lastCheckInStatus: checkInRecord.lastCheckedInAt.status,
      nextCheckIn: formattedNextCheckIn,
      nextCheckInStatus: checkInRecord.nextCheckInDate.status,
    },
  });
});

// Create court details
const createCourt = asyncHandler(async (req: Request, res: Response) => {
  const {
    courtName,
    courtType,
    level,
    addressLine,
    city,
    state,
    country,
    zipCode,
    courtContactNo,
    courtEmail,
  } = req.body as {
    courtName: string;
    courtType: courtTypes; //  enum: Object.values(courtTypes),
    level: courtLevel; //  enum: Object.values(courtLevel),
    addressLine: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    courtContactNo: string;
    courtEmail: string;
  };
  if (
    !courtName.trim() ||
    !courtType.trim() ||
    !level.trim() ||
    !addressLine.trim() ||
    !city.trim() ||
    !state.trim() ||
    !country.trim() ||
    !zipCode.trim() ||
    !courtContactNo.trim() ||
    !courtEmail.trim()
  )
    return res.status(404).json({ Message: "All details are required" });
  if (!isValidData(city))
    return res
      .status(401)
      .json({ Message: "City name only contain characters" });
  if (!isValidData(state))
    return res
      .status(401)
      .json({ Message: "state name only contain characters" });
  if (!isValidData(country))
    return res
      .status(401)
      .json({ Message: "country name only contain characters" });
  if (!Object.values(courtTypes).includes(courtType))
    return res.status(404).json({
      Message: `Invalid court type. Allowed types are: ${Object.values(
        courtTypes
      ).join(", ")}`,
    });
  if (!Object.values(courtLevel).includes(level))
    return res.status(404).json({
      Message: `Invalid court level. Allowed types are: ${Object.values(
        courtLevel
      ).join(", ")}`,
    });
  if (!isValidEmail(courtEmail))
    return res.status(400).json({ Message: "Invalid email" });
  if (!isValidPhone(courtContactNo))
    return res.status(400).json({ Message: "Invalid Phone no" });

  const court = await Court.create({
    courtName,
    courtType,
    level,
    addressLine,
    city,
    state,
    country,
    zipCode,
    courtContactNo,
    courtEmail,
  });
  const isCourtExist = await Court.findById(court?._id);
  if (!isCourtExist)
    return res
      .status(500)
      .json({ Message: "Internal server error. try again" });
  console.log("court", court);

  return res
    .status(200)
    .json({ Message: "Court details submitted", isCourtExist });
});

// get court details
const getCourtDetails = asyncHandler(async (req: Request, res: Response) => {
  const { courtId } = req.params;
  if (!courtId) return res.status(404).json({ Message: "Court id is missing" });
  const isCourtExist = await Court.findById(courtId);
  if (!isCourtExist)
    return res.status(404).json({ Message: "Court data not found." });
  return res.status(200).json({ Message: "Court data fetched", isCourtExist });
});

const updateAddressAndSendPictureAsProof = asyncHandler(
  async (req: Request, res: Response) => {
    const { homeAddress } = req.body as { homeAddress: String };
    if (!homeAddress)
      return res.status(401).json({
        Message: "Home address can't be empty",
      });

    const uploads = await uploadToCloudinary(req.file?.buffer!);
    if (!uploads)
      return res.status(401).json({ Message: "eror during upload img" });
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
        .json({ Message: "Address or image can't be update" });

    return res
      .status(200)
      .json({ Message: "Address submitted", isUserAddressUpdated });
  }
);

export {
  getUserAgencyInfo,
  creatCheckIn,
  checkIn,
  getCheckInStatus,
  createCourt,
  getCourtDetails,
  updateAddressAndSendPictureAsProof,
};

// country, phone no, Ai no, 
