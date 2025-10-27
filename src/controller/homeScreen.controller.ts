// /api/agency/:userId
// /api/checkin/:userId
// /api/checkin
// /api/courtdates/:userId
// /api/courtdates
// /api/dashboard/:userId

import { Request, Response } from "express";
import HomeScreenModel from "../models/homeScreen.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Status } from "../models/homeScreen.model.js";
import { isDateValid } from "../utils/dataValidators.js";

const { Agency, CheckIn, CourtDate } = HomeScreenModel; // Models

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
  return res.status(200).json({
    message: "Check-in found",
    nextCheckInDate: formattedNextCheckIn,
    nextCheckInstatus: isCheckInRecordExist.nextCheckInDate.status,
    lastCheckInDate: isCheckInRecordExist.lastCheckedInAt.date,
    lastCheckInStatus: isCheckInRecordExist.lastCheckedInAt.status,
  });
});

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

// Check-In Here
const checkIn = asyncHandler(async (req: Request, res: Response) => {
  const { checkIn_Id } = req.params;
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

  const checkInRecord = await CheckIn.findByIdAndUpdate(
    checkIn_Id,
    {
      $set: {
        "lastCheckedInAt.status": Status.Done,
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

export { getUserAgencyInfo, creatCheckIn, checkIn, getCheckInStatus };
