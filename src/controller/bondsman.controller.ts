import { Request, Response } from "express";
import { Bondsman, Court, Reminder, Status } from "../models/bondsman.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  isValidEmail,
  isValidPassword,
  isValidPhone,
} from "../utils/dataValidators.js";
import { User, CheckIn } from "../models/user.model.js";
import { Admin } from "../models/admin.model.js";

const signUpAsBondsman = asyncHandler(async (req: Request, res: Response) => {
  const { BondsmanName, phoneNo, password, email, countryCode } = req.body as {
    BondsmanName: string;
    phoneNo: string;
    password: string;
    email: string;
    countryCode: string;
  };
  if (!BondsmanName.trim() || !phoneNo.trim() || !password.trim())
    return res.status(400).json({ message: "All fields are required" });
  if (!isValidPhone(phoneNo))
    return res.status(400).json({ message: "Invalid phone number" });
  if (!isValidEmail(email))
    return res.status(400).json({ message: "Invalid email" });
  if (!isValidPassword(password))
    return res.status(401).json({
      message:
        "Password must contain at least 1 uppercase, lowercase, number, and special character, and password should be upto 8 characters long",
    });

  const isBondsmanExist = await Bondsman.findOne({
    email: { $regex: new RegExp(`^${email}$`, "i") },
  });
  if (isBondsmanExist)
    return res
      .status(409)
      .json({ message: "Account already registered with this creadentials" });

  const createBondsman = await Bondsman.create({
    name: BondsmanName,
    phoneNo,
    password,
    email,
    countryCode,
  });
  const accessToken = createBondsman.generateAccessToken();

  const isCreatedBondsmanSuccessFully = await Bondsman.findById(
    createBondsman?._id
  ).select("-password -refreshToken");
  if (!isCreatedBondsmanSuccessFully)
    return res.status(500).json({ message: "Failed to create Bondsman" });
  return res.status(201).json({
    message: "Bondsman created successfully",
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
    return res.status(400).json({ message: "Invalid Phone no." });
  const isExistBondsman = await Bondsman.findOne({ phoneNo: phone }).populate(
    "user",
    "_id firstName middleName lastName phone"
  );
  if (!isExistBondsman)
    return res
      .status(404)
      .json({ message: "Bondsman not exist. Kindly signUp first" });
  const isMatchPassword = await isExistBondsman.isCorrectPassword(password);
  if (!isMatchPassword)
    return res.status(401).json({ message: "Wrong Password" });

  const accessToken = isExistBondsman.generateAccessToken();
  const refreshToken = isExistBondsman.generateRefreshToken();

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
      message: "Bondsman login successfully",
      data: {
        isExistBondsman: isExistBondsman,
        accessToken: `${accessToken}`,
      },
    });
});

const logoutAsBondsman = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id;
  if (!userId)
    return res
      .status(404)
      .json({ message: "User not found or maybe it's already log out" });
  await Bondsman.findByIdAndUpdate(
    userId,
    {
      $set: {
        refreshToken: "",
      },
    },
    {
      new: true,
    }
  );
  return res
    .status(200)
    .clearCookie("accessToken", { httpOnly: true, secure: true })
    .clearCookie("refreshToken")
    .json({ message: "Bondsman logout successfully" });
});

const searchByPhoneNumber = asyncHandler(
  async (req: Request, res: Response) => {
    const { search } = req.query;
    if (!search)
      return res.status(404).json({ message: "Search can't be empty" });
    const searchedUser = await User.find({
      $or: [
        {
          phoneNo: { $regex: search, $options: "i" },
        },
        {
          firstName: { $regex: search, $options: "i" },
        },
        {
          lastName: { $regex: search, $options: "i" },
        },
        {
          middleName: { $regex: search, $options: "i" },
        },
      ],
    }).select("-password");
    if (searchedUser.length === 0)
      return res.status(404).json({ message: "No result found" });
    return res.status(200).json({
      message:
        searchedUser.length === 0
          ? "No data found while searching"
          : `${searchedUser.length} Users found`,
      searchedUser,
    });
  }
);

const deleteCheckIn = asyncHandler(async (req: Request, res: Response) => {
  const { checkIn_Id } = req.params;
  const isDeletedCheckIn = await CheckIn.find({
    _id: checkIn_Id,
    isActive: true,
  });
  if (isDeletedCheckIn.length === 0)
    return res.status(400).json({ message: "No check in found for delete" });
  console.log("isDeleteCheckIn", isDeletedCheckIn);

  const isCheckInAvailableForDelete = await CheckIn.findByIdAndUpdate(
    checkIn_Id,
    {
      $set: {
        isActive: false,
      },
    },
    {
      new: true,
    }
  );
  if (!isCheckInAvailableForDelete)
    return res
      .status(404)
      .json({ message: "Check-in cancellation not complete " });

  return res
    .status(200)
    .json({ message: "Delete Successfully", isCheckInAvailableForDelete });
});

const addUser = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = await User.findById(userId).select("-password -refreshToken");
  if (!user) return res.status(404).json({ message: "User account not found" });

  const userAdd = await Bondsman.findByIdAndUpdate(
    req.user?._id,
    {
      $addToSet: {
        user: userId, // ignore duplications and add unique values only
      },
    },
    {
      new: true,
    }
  )
    .select("-password -refreshToken")
    .populate("user", "_id firstName middleName lastName phoneNo email");
  await User.updateOne(
    {
      _id: userId,
    },
    { $set: { bondsman: req.user?._id } }
  ); // map bondsman with user that add recently

  const isUserAddedSuccessfully = await Bondsman.findById(userAdd?._id);
  if (!isUserAddedSuccessfully)
    return res
      .status(500)
      .json({ message: "Internal server error. User not added" });

  return res.status(200).json({
    message: `${isUserAddedSuccessfully.user.length} User added successfully`,
    userAdd,
  });
});

const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const isUserRemove = await Bondsman.findOneAndUpdate(
    {
      _id: req.user?._id,
    },
    {
      $pull: {
        user: userId,
      },
    },
    {
      new: true,
    }
  )
    .select("-password -refreshToken")
    .populate("user", "_id firstName middleName lastName phoneNo email");
  if (!isUserRemove)
    return res
      .status(404)
      .json({ message: "Bondsman not found or user not linked" });
  return res.status(200).json({
    message: `${isUserRemove.user.length} User left`,
    isUserRemove,
  });
});

const getAllUsersOfBondsman = asyncHandler(
  async (req: Request, res: Response) => {
    const isBondsmanExist = await Bondsman.findById(req.user?._id).populate(
      "user",
      "_id firstName middleName lastName phoneNo email"
    );
    if (!isBondsmanExist)
      return res
        .status(404)
        .json({ message: "Bondsman not exist or logged out" });

    const filterdUser = isBondsmanExist.user;
    return res.status(200).json({
      message:
        isBondsmanExist.user.length === 0
          ? "No user found"
          : `${isBondsmanExist.user.length} user found`,
      filterdUser,
    });
  }
);

const updateUserDetailsByBondsman = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const {
      firstName,
      middleName,
      lastName,
      email,
      phoneNo,
      street,
      ZipCode,
      isActive,
    } = req.body as {
      firstName: string;
      middleName: string;
      lastName: string;
      email: string;
      phoneNo: string;
      street: string;
      ZipCode: string;
      isActive: boolean;
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
      return res
        .status(400)
        .json({ message: "Street or ZIP code is too long" });
    if (isActive !== true && isActive !== false)
      return res
        .status(400)
        .json({ message: "User should be active or inactive" });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    let data = {
      firstName,
      middleName,
      lastName,
      email,
      phoneNo,
      street,
      ZipCode,
      isActive,
    };

    const updatedUserDetails = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          firstName: data.firstName,
          middleName: data.middleName,
          lastName: data.lastName,
          email: data.email.toLowerCase(),
          phoneNo: data.phoneNo,
          street: data.street,
          ZipCode: data.ZipCode,
          isActive: data.isActive,
        },
      },
      {
        new: true,
      }
    ).select("-password -refreshToken -isAgreed");

    if (!updatedUserDetails)
      return res.status(401).json({
        message:
          "Internal Server error so details are not updated. try again !..",
      });

    return res
      .status(200)
      .json({ message: "Details updated successfully", updatedUserDetails });
  }
);


const setCourtReminders = asyncHandler(async (req: Request, res: Response) => {
  const { caseNumber, reminderDate, reminderNote } = req.body as {
    caseNumber: string;
    reminderDate: Date;
    reminderNote?: string;
  };
  const { userId, courtId } = req.params;
  const isUserExist = await User.findById(userId).select("-password");
  const isCourtExist = await Court.findById(courtId);
  if (!isUserExist) return res.status(404).json({ message: "User not found" });
  if (!isCourtExist)
    return res.status(404).json({ message: "Court not found" });
  if (!caseNumber.trim() || !reminderDate)
    return res
      .status(401)
      .json({ message: "Case number, Reminder date cannot be empty" });

  if (reminderNote && reminderNote.length < 10)
    return res
      .status(400)
      .json({ message: "Reminder message should be 10 charcters long" });

  const createReminder = await Reminder.create({
    user: userId,
    court: courtId,
    caseNumber,
    reminderDate,
    reminderNote,
  });
  await User.findByIdAndUpdate(
    userId,
    {
      $push: {
        reminders: createReminder?._id,
      },
    },
    { new: true }
  );
  await Court.findByIdAndUpdate(
    courtId,
    {
      $push: {
        reminders: createReminder?._id,
      },
    },
    { new: true }
  );
  const isReminderCreated = await Reminder.findById(
    createReminder?._id
  ).populate([
    {
      path: "user",
      select: "_id firstName middleName lastName email phoneNo reminders",
      populate: {
        path: "reminders",
        select: "caseNumber reminderDate reminderNote ",
      },
    },
    {
      path: "court",
      select: "courtName addressLine state city country reminders",
      populate: {
        path: "reminders",
        select: "caseNumber reminderDate reminderNote ",
      },
    },
  ]);
  if (!isReminderCreated)
    return res
      .status(500)
      .json({ message: "Internal server error. Reminder can't create" });
  return res
    .status(200)
    .json({ message: "Reminder created success", isReminderCreated });
});

const getCourtReminderDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const { reminderId } = req.params;
    const isReminderExist = await Reminder.find({
      _id: reminderId,
      isActive: true,
    })
      .populate([
        {
          path: "user",
          select: "_id firstName lastName email phoneNo",
        },
        {
          path: "court",
          select: "courtName addressLine city state country",
        },
      ])
      .lean();
    if (!isReminderExist)
      return res.status(404).json({ message: "Reminder not found" });
    isReminderExist;
    return res.status(200).json({
      message: `${isReminderExist.length === 0}`
        ? "No reminder found"
        : "Reminder details fetched",
      isReminderExist,
    });
  }
);

const cancelReminder = asyncHandler(async (req: Request, res: Response) => {
  const { reminderId } = req.params;
  const isReminderExist = await Reminder.find({
    _id: reminderId,
    isActive: true,
  });
  if (!isReminderExist)
    return res.status(404).json({ message: "Reminder not found" });

  const cancelReminder = await Reminder.findByIdAndUpdate(
    reminderId,
    {
      $set: {
        isActive: false,
      },
    },
    { new: true }
  )
    .populate([
      {
        path: "user",
        select: "_id firstName lastName email phoneNo",
      },
      {
        path: "court",
        select: "courtName addressLine city state country",
      },
    ])
    .lean();
  return res
    .status(200)
    .json({ message: "Reminder Cancelled success", cancelReminder });
});

const deleteReminder = asyncHandler(async (req: Request, res: Response) => {
  const { reminderId } = req.params;
  if (!reminderId)
    return res.status(404).json({ message: "Reminder Id missing" });
  const isReminderExist = await Reminder.findById(reminderId);
  if (!isReminderExist)
    return res.status(404).json({ message: "Reminder not found" });
  const isReminderDeleted = await Reminder.findByIdAndDelete({
    _id: reminderId,
  });
  if (!isReminderDeleted?._id)
    return res.status(500).json({ message: "Internal server error" });
  return res
    .status(200)
    .json({ message: "Reminder delete success", isReminderDeleted });
});

const getAd = asyncHandler(async (req: Request, res: Response) => {
  const fetchedAd = await Admin.find({}, "adImg");
  if (fetchedAd.length === 0)
    return res.status(201).json({ message: "No ad found" });
  return res
    .status(200)
    .json({ message: `${fetchedAd[0].adImg.length} ad found`, fetchedAd });
});

export {
  signUpAsBondsman,
  loginAsBondsman,
  logoutAsBondsman,
  searchByPhoneNumber,
  deleteCheckIn,
  addUser,
  deleteUser,
  getAllUsersOfBondsman,
  updateUserDetailsByBondsman,
  // userCheckInHistory,
  setCourtReminders,
  getCourtReminderDetails,
  cancelReminder,
  getAd,
  deleteReminder,
};
