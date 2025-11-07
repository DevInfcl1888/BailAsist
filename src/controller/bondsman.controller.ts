import { Request, Response } from "express";
import { Bondsman, CheckIn, Status } from "../models/bondsman.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  isValidEmail,
  isValidPassword,
  isValidPhone,
} from "../utils/dataValidators.js";
import { User } from "../models/user.model.js";
import { getCheckInStatus } from "./user.controller.js";

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

const creatCheckIn = asyncHandler(async (req: Request, res: Response) => {
  const { day } = req.body as { day: number };
  const { userId } = req.params;
  if (!day)
    return res.status(400).json({
      message: "Please set next check-in day interval (e.g. 7 (in days))",
    });

  // Find the user's check-in record
  let bondsman = await Bondsman.findOne({ _id: req.user?._id });
  // console.log("bondsman", bondsman);
  if (!bondsman) return res.status(404).json({ message: "Bondsman not found" });

  let user = await User.findOne({ _id: userId });
  // console.log("user", user);
  if (!user) return res.status(404).json({ message: "User not found" });

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
    return res.status(403).json({ message: "Error during create check-in" });

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
    message: "Check-in successful",
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
    if (!searchedUser)
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
  if (!checkIn_Id) return res.status(400).json({ message: "Invalid _id" });
  const isDeletedCheckIn = await CheckIn.deleteOne({ _id: checkIn_Id });
  console.log("isDeleteCheckIn", isDeletedCheckIn);
  if (!isDeletedCheckIn.acknowledged)
    return res.status(401).json({ message: "Deletion couldn't be complete" });
  return res
    .status(200)
    .json({ message: "Delete Successfully", isDeletedCheckIn });
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
    const { firstName, middleName, lastName, email, phoneNo, street, ZipCode } =
      req.body as {
        firstName: string;
        middleName: string;
        lastName: string;
        email: string;
        phoneNo: string;
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

const getUserCheckInStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const getUserCheckIn = await CheckIn.find({ user: userId }).populate(
      "user",
      "_id firstName middleName lastName phoneNo email"
    );
    if (!getUserCheckIn)
      return res.status(404).json({
        message: "User not found or maybe check-in is not created yet",
      });
    console.log("getCheckIn", getUserCheckIn);
    return res.status(200).json({
      message:
        getUserCheckIn.length === 0
          ? "No check-in found"
          : `${getUserCheckIn.length} Check-in found`,
      getUserCheckIn,
    });
  }
);

// const getRecentCheckedInByUser = asyncHandler(
//   async (req: Request, res: Response) => {
//     const { userId } = req.params;
//     if (!userId) return res.status(400).json({ message: "User not found" });

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
//         .json({ message: "No Check-in found of this user" });

//     // const formattedData = proof.map((data) => {
//     //   user: data.user;
//     //   photoUrl: data.photoUrl;
//     //   message: data.message;
//     //   location: data.location;
//     //   date: new Date(data.createdAt).toLocaleString("en-GB", {
//     //     day: "2-digit",
//     //     month: "short",
//     //     year: "numeric",
//     //     hour: "2-digit",
//     //     minute: "2-digit",
//     //     second: "2-digit",
//     //   });
//     // });
//     return res.status(200).json({
//       message: "Check-in history fetched successfully",
//       // total: proof.length,
//       // data: formattedData,
//     });
//   }
// );

export {
  signUpAsBondsman,
  creatCheckIn,
  loginAsBondsman,
  logoutAsBondsman,
  searchByPhoneNumber,
  deleteCheckIn,
  addUser,
  deleteUser,
  getAllUsersOfBondsman,
  updateUserDetailsByBondsman,
  getUserCheckInStatus,
  // getRecentCheckedInByUser,
};
