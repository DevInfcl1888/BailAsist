import { Request, Response } from "express";
import HomeScreenModel from "../models/homeScreen.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isValidData, isValidPhone } from "../utils/dataValidators.js";

const { Agency, CheckIn, Court } = HomeScreenModel;

const createAgency = asyncHandler(async (req: Request, res: Response) => {
  const { agencyName, phoneNo, email, agentName, address } = req.body as {
    agencyName: string;
    phoneNo: string;
    email: string;
    agentName: string;
    address: string;
  };
  if (
    !agencyName.trim() ||
    !phoneNo.trim() ||
    !email.trim() ||
    !agentName.trim() ||
    !address.trim()
  )
    return res.status(400).json({ message: "All fields are required" });
  if (isValidPhone(phoneNo))
    return res.status(400).json({ message: "Invalid phone number" });
  if (address.length < 10 || address.length > 100)
    return res.status(400).json({ message: "Invalid address" });
  if (!isValidData(agentName))
    return res.status(401).json({ Message: "Agent name seems invalid" });

  const isAgencyExist = await Agency.findOne({ email });
  if (!isAgencyExist)
    return res.status(409).json({ message: "Agency already exists" });
  const createAgency = await Agency.create({
    name: agencyName,
    phoneNo,
    email,
    agentName,
    address,
  });
  if (!createAgency)
    return res.status(500).json({ message: "Failed to create agency" });
  return res
    .status(201)
    .json({ message: "Agency created successfully", agency: createAgency });
});

export { createAgency };
