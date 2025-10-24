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

const getCheckIn = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
});
const checkIn = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id;

  // Find the user's check-in record
  let user = await User.findOne({ userId });

  if (!user) {
    return res.status(404).json({ msg: "User not found" });
  }

  //   if (!checkIn.lastCheckedInAt) {
  //     checkIn.status = Status.Pending;
  //   }
  // Update lastCheckedInAt and nextCheckInDate
  const cheackIn = await CheckIn.findByIdAndUpdate(req.user?.id, {
    lastCheckedInAt = new Date(),
    nextCheckInDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // next week
    status = Status.Done,
  },{
    new
  });
  //   lastCheckedInAt = new Date();
  //   nextCheckInDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // next week
  //   status = Status.Done;
  console.log("checkIn.status", checkIn.status);
  console.log("checkIn.lastCheckedInAt", checkIn.lastCheckedInAt);
  console.log("checkIn.nextCheckInDate", checkIn.nextCheckInDate);

  await checkIn.save();

  return res.status(200).json({
    msg: "Check-in successful",
    lastCheckedInAt: checkIn.lastCheckedInAt,
    nextCheckInDate: checkIn.nextCheckInDate,
    status: checkIn.status,
  });
});

export { getUserAgencyInfo, checkIn };
