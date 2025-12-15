import { Request, Response } from "express";
import { Bondsman, Court, Reminder, Status } from "../models/bondsman.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  isValidData,
  isValidEmail,
  isValidPassword,
} from "../utils/dataValidators.js";
import { User, CheckIn } from "../models/user.model.js";
import { Admin } from "../models/admin.model.js";
import { ContactUs, PrivacyPolicy } from "../models/content.model.js";

const signUpAsBondsman = asyncHandler(async (req: Request, res: Response) => {
  const {
    BondsmanName,
    phoneNo,
    password,
    confirmPassword,
    email,
    countryCode,
    address,
  } = req.body as {
    BondsmanName: string;
    phoneNo: string;
    password: string;
    confirmPassword: string;
    email: string;
    countryCode: string;
    address: string;
  };
  if (!isValidEmail(email))
    return res.status(400).json({ message: "Invalid email" });
  if (!isValidPassword(password) || !isValidPassword(confirmPassword))
    return res.status(400).json({
      message:
        "Password must contain at least 1 uppercase, lowercase, number, and special character, and password should be upto 8 characters long",
    });
  if (password !== confirmPassword)
    return res
      .status(400)
      .json({ message: "Confirm password should be same as password" });
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
    address,
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

  return res.status(200).json({
    message: "Bondsman login successfully",
    data: {
      isExistBondsman: isExistBondsman,
      accessToken: accessToken,
      refreshToken: refreshToken,
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
      "_id firstName middleName lastName phoneNo email ZipCode street"
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
    const {
      firstName,
      middleName,
      lastName,
      email,
      phoneNo,
      homeAddress,
      street,
      ZipCode,
      countryCode,
      isActive,
    } = req.body as {
      firstName?: string;
      middleName?: string;
      lastName?: string;
      email?: string;
      phoneNo?: string;
      homeAddress?: string;
      street?: string;
      ZipCode?: string;
      countryCode?: string;
      isActive?: boolean;
    };
    const { userId } = req.params;
    const updateFields: any = {};

    if (firstName !== undefined) {
      if (!firstName.trim())
        return res.status(400).json({ message: "First name can't be empty" });
      if (!isValidData(firstName))
        return res.status(400).json({ message: "Invalid first name" });
      updateFields.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      if (!lastName.trim())
        return res.status(400).json({ message: "Last name can't be empty" });
      if (!isValidData(lastName))
        return res.status(400).json({ message: "Invalid last name" });
      updateFields.lastName = lastName.trim();
    }

    if (email !== undefined) {
      if (!email.trim())
        return res.status(400).json({ message: "Email can't be empty" });
      if (!isValidEmail(email))
        return res.status(400).json({ message: "Invalid email" });
      updateFields.email = email.toLowerCase().trim();
    }

    if (phoneNo !== undefined) {
      if (!phoneNo.trim())
        return res.status(400).json({ message: "Phone number can't be empty" });
      updateFields.phoneNo = phoneNo.trim();
    }

    if (homeAddress !== undefined) {
      if (!homeAddress.trim())
        return res.status(400).json({ message: "Home address can't be empty" });
      updateFields.homeAddress = homeAddress.trim();
    }

    if (street !== undefined) {
      if (!street.trim())
        return res.status(400).json({ message: "Street can't be empty" });
      updateFields.street = street.trim();
    }

    if (ZipCode !== undefined) {
      if (!ZipCode.trim())
        return res.status(400).json({ message: "Zip code can't be empty" });
      updateFields.ZipCode = ZipCode.trim();
    }

    if (countryCode !== undefined) {
      if (!countryCode.trim())
        return res.status(400).json({ message: "Country code can't be empty" });
      updateFields.countryCode = countryCode.trim();
    }

    if (isActive !== undefined) {
      updateFields.isActive = isActive;
    }

    if (Object.keys(updateFields).length === 0)
      return res.status(400).json({ message: "No fields provided to update" });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: updateFields,
      },
      {
        new: true,
      }
    ).select("-password -refreshToken");

    if (!updatedUser)
      return res
        .status(404)
        .json({ message: "User not found or data couldn't update" });

    return res
      .status(200)
      .json({ message: "User data updated successfully", updatedUser });
  }
);

const setCourtReminders = asyncHandler(async (req: Request, res: Response) => {
  const {
    roomNumber,
    reminderDate,
    reminderTime,
    reminderNote,
    status,
    interval,
  } = req.body as {
    roomNumber: string;
    reminderDate: string; // YYYY-MM-DD
    reminderTime: string;
    reminderNote?: string;
    status: string;
    interval: string;
  };
  const { userId, courtId } = req.params;
  const isUserExist = await User.findById(userId).select("-password");
  const isCourtExist = await Court.findById(courtId);
  if (!isUserExist) return res.status(404).json({ message: "User not found" });
  if (!isCourtExist)
    return res.status(404).json({ message: "Court not found" });

  if (!reminderDate || !reminderTime)
    return res
      .status(400)
      .json({ message: "Reminder date and time are missing" });
  if (!status)
    return res
      .status(400)
      .json({ message: "Status should be Complete, Pending Cancel" });
  if (!interval)
    return res
      .status(400)
      .json({ message: "Reminder interval couldn't be empty" });

  const isUserConnectedWithBondsman = await User.find({
    bondsman: isUserExist.bondsman,
  });
  if (!isUserConnectedWithBondsman)
    return res
      .status(200)
      .json({ message: "This user has not assign any bondsman yet" });
  const isDateValid = new Date(reminderDate).getDate();
  const now = new Date().getDate();
  if (now >= isDateValid) {
    return res
      .status(200)
      .json({ message: "Date shoudld be greater then today" });
  }
  const combinedDateTimeString = `${reminderDate}T${reminderTime}`;
  const reminderDateTime = new Date(combinedDateTimeString);
  console.log({ reminderDateTime });
  // Check if the date conversion was valid
  if (isNaN(reminderDateTime.getTime())) {
    return res
      .status(400)
      .json({ message: "Invalid date or time format provided." });
  }
  if (reminderDateTime) {
  }
  const createReminder = await Reminder.create({
    user: userId,
    court: courtId,
    roomNumber: roomNumber ? roomNumber : " ",
    reminderDate,
    reminderTime,
    reminderDateTime,
    reminderNote: reminderNote ? reminderNote : " ",
    status,
    interval,
  });
  await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        court: courtId,
      },
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
        select:
          "court roomNumber reminderDate reminderTime reminderNote status interval isActive",
      },
    },
    {
      path: "court",
      select: "courtName addressLine state city country reminders",
      populate: {
        path: "reminders",
        select:
          "user court roomNumber reminderDate reminderTime reminderNote status interval",
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

const deleteBondsmanProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const isAdmin = await Admin.findById(req.user?._id);
    if (!isAdmin)
      return res
        .status(403)
        .json({ message: "only admin can allow this route" });
    const { id } = req.params;
    const BondsmanUserInfo = await Bondsman.deleteOne({ _id: id });

    if (BondsmanUserInfo.deletedCount !== 1)
      return res.status(401).json({
        message: "Bondsman profile can't be deleted",
        BondsmanUserInfo,
      });
    return res
      .status(200)
      .json({ message: "Bondsman profile deleted", BondsmanUserInfo });
  }
);

const createContactUs = asyncHandler(async (req: Request, res: Response) => {
  const { text } = req.body;

  if (!text || !text.trim())
    return res.status(400).json({ message: "Text is required" });

  const userId = req.user?._id;

  // CHECK ADMIN
  let role: "Admin" | "Bondsman" = "Bondsman";

  const isBondsman = await Bondsman.findById(userId);
  if (isBondsman) role = "Bondsman";
  console.log({ role });
  // Delete only same-role previous entries
  const a = await ContactUs.deleteMany({ role });
  console.log({ a });
  // Create new entry
  const contactUs = await ContactUs.create({
    text: text.trim(),
    createdBy: userId,
    role,
  });

  return res.status(200).json({
    message: "Contact Us updated successfully",
    contactUs,
  });
});

const getContactUs = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id;

  // CHECK ADMIN
  let role: "Admin" | "Bondsman" = "Bondsman";

  const isBondsman = await Bondsman.findById(userId);
  if (isBondsman) role = "Bondsman";

  const contactUs = await ContactUs.findOne({ role });
  if (!contactUs)
    return res.status(404).json({ message: "Contact us content not found" });

  return res
    .status(200)
    .json({ message: "Contact us content retrieved", contactUs });
});

const createPrivacyPolicy = asyncHandler(
  async (req: Request, res: Response) => {
    const { text } = req.body as {
      text: string;
    };

    const userId = req.user?._id;

    // CHECK ADMIN
    let role: "Admin" | "Bondsman" = "Bondsman";

    const isBondsman = await Bondsman.findById(userId);
    if (isBondsman) role = "Bondsman";
    console.log({ role });

    // Delete all previous entries
    const a = await PrivacyPolicy.deleteMany({ role });
    console.log({ a });

    if (!text || !text.trim())
      return res.status(400).json({ message: "Text field is required" });

    // Create new entry
    const privacyPolicy = await PrivacyPolicy.create({
      text: text.trim(),
      createdBy: userId,
      role,
    });

    if (!privacyPolicy)
      return res
        .status(500)
        .json({ message: "Failed to create privacy policy content" });

    return res.status(200).json({
      message: "Privacy policy content created successfully",
      privacyPolicy,
    });
  }
);

const getPrivacyPolicy = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id;

  // CHECK ADMIN
  let role: "Admin" | "Bondsman" = "Bondsman";

  const isBondsman = await Bondsman.findById(userId);
  if (isBondsman) role = "Bondsman";

  const privacyPolicy = await PrivacyPolicy.findOne({ role });

  if (!privacyPolicy)
    return res
      .status(404)
      .json({ message: "Privacy policy content not found" });

  return res
    .status(200)
    .json({ message: "Privacy policy content retrieved", privacyPolicy });
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
  deleteBondsmanProfile,
  setCourtReminders,
  getCourtReminderDetails,
  cancelReminder,
  getAd,
  deleteReminder,
  createContactUs,
  getContactUs,
  createPrivacyPolicy,
  getPrivacyPolicy,
};
