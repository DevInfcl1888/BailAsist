import { Request, Response } from "express";
import HomeScreenModel from "../models/homeScreen.model.js"; // Models
import { asyncHandler } from "../utils/asyncHandler.js"; // to handle async errors
import { courtTypes, courtLevel, Status } from "../models/homeScreen.model.js"; // enums
import {
  isValidEmail,
  isValidPhone,
  isValidData,
} from "../utils/dataValidators.js"; // data validators

const { Court } = HomeScreenModel; // Models

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

export { createCourt, getCourtDetails };
