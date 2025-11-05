import { Request, Response } from "express";
import HomeScreenModel from "../models/homeScreen.model.js"; // Models
import { asyncHandler } from "../utils/asyncHandler.js"; // to handle async errors
import { User } from "../models/user.model.js"; // User Model
import { courtTypes, courtLevel, Status } from "../models/homeScreen.model.js"; // enums
import {
  isValidEmail,
  isValidPhone,
  isValidData,
  isDateValid,
} from "../utils/dataValidators.js"; // data validators
import { uploadToCloudinary } from "../utils/cloudinary.js"; // cloudinary upload

const { Bondsman, CheckIn, Court } = HomeScreenModel; // Models


const getUserBondsmanInfo = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const isBondsmanExist = await User.findById(userId).populate([
      {
        path: "bondsman",
        select: "name phoneNo",
      },
    ]).select("-password -refreshToken")
    if (!isBondsmanExist)
      return res.status(404).json({ message: "User not found" });
    return res
      .status(200)
      .json({ message: "Bondsman Information", isBondsmanExist });
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
  });
  if (!isCheckInRecordExist)
    return res.status(404).json({
      message: "No Record found on this date.",
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
    return res.status(404).json({ message: "Check-in Id not found" });

  let isCheckInExist = await CheckIn.findOne({ _id: checkIn_Id });

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
  );
  console.log("checkInRecord", checkInRecord);

  if (!checkInRecord)
    return res
      .status(403)
      .json({ message: "Check-in couldn't complete! try again..." });

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
    message: "Check-in successful",
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
    return res.status(404).json({ message: "All details are required" });
  if (!isValidData(city))
    return res
      .status(401)
      .json({ message: "City name only contain characters" });
  if (!isValidData(state))
    return res
      .status(401)
      .json({ message: "state name only contain characters" });
  if (!isValidData(country))
    return res
      .status(401)
      .json({ message: "country name only contain characters" });
  if (!Object.values(courtTypes).includes(courtType))
    return res.status(404).json({
      message: `Invalid court type. Allowed types are: ${Object.values(
        courtTypes
      ).join(", ")}`,
    });
  if (!Object.values(courtLevel).includes(level))
    return res.status(404).json({
      message: `Invalid court level. Allowed types are: ${Object.values(
        courtLevel
      ).join(", ")}`,
    });
  if (!isValidEmail(courtEmail))
    return res.status(400).json({ message: "Invalid email" });
  if (!isValidPhone(courtContactNo))
    return res.status(400).json({ message: "Invalid Phone no" });

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
      .json({ message: "Internal server error. try again" });
  console.log("court", court);

  return res
    .status(200)
    .json({ message: "Court details submitted", isCourtExist });
});

// get court details
const getCourtDetails = asyncHandler(async (req: Request, res: Response) => {
  const { courtId } = req.params;
  if (!courtId) return res.status(404).json({ message: "Court id is missing" });
  const isCourtExist = await Court.findById(courtId);
  if (!isCourtExist)
    return res.status(404).json({ message: "Court data not found." });
  return res.status(200).json({ message: "Court data fetched", isCourtExist });
});

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
  getUserBondsmanInfo,
  checkIn,
  getCheckInStatus,
  createCourt,
  getCourtDetails,
  updateAddressAndSendPictureAsProof,
  updateLatAndLong,
};
