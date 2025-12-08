import { Admin } from "../models/admin.model.js";
import express, { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  isValidData,
  isValidEmail,
  isValidPassword,
} from "../utils/dataValidators.js";
import { Bondsman } from "../models/bondsman.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { ContactUs, PrivacyPolicy } from "../models/content.model.js";

const adminSignUp = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, phoneNo, password } = req.body as {
    username: string;
    email: string;
    phoneNo: string;
    password: string;
  };
  const isAdmin = await Admin.find({ role: "admin" });

  if (isAdmin.length !== 0)
    return res.status(403).json({ message: "Admin already exist" });

  if (!username.trim() || !email.trim() || !phoneNo.trim() || !password.trim())
    return res.status(404).json({ message: "All fields are required" });
  if (!isValidData(username))
    return res.status(401).json({ message: "Invalid username." });
  if (!isValidEmail(email))
    return res.status(401).json({ message: "Invalid email" });
  if (!isValidPassword(password))
    return res.status(401).json({
      message:
        "Password must contain at least 1 uppercase, lowercase, number, and special character, and password should be upto 8 characters long",
    });
  const normalizedEmail = email.toLowerCase();
  const admin = await Admin.create({
    username,
    email: normalizedEmail,
    phoneNo,
    password,
  });
  if (!admin)
    return res.status(500).json({ message: "Internal server error occur" });
  const refreshToken = admin.generateRefreshToken();
  const accessToken = admin.generateAccessToken();
  admin.refreshToken = refreshToken;
  await admin.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json({ message: "Admin signUp", admin, accessToken: accessToken });
});

const adminLogin = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body as {
    username: string;
    password: string;
  };
  const isAdminExist = await Admin.find({ role: "admin", username: username });
  if (isAdminExist.length === 0)
    return res.status(400).json({ message: "Admin not exist" });

  if (!isValidData(username))
    return res.status(401).json({ message: "Invalid username" });
  const isMatch = await isAdminExist[0].isCorrectPassword(password);
  if (!isMatch) return res.status(401).json({ message: "Invalid password" });

  const accessToken = isAdminExist[0].generateAccessToken();
  const refreshToken = isAdminExist[0].generateRefreshToken();

  return res.status(200).json({
    message: "Admin logged-in",
    accessToken: accessToken,
    refreshToken: refreshToken,
  });
});

const adminLogout = asyncHandler(async (req: Request, res: Response) => {
  const isAdminLogin = await Admin.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        refreshToken: "",
      },
    },
    {
      new: true,
    }
  );
  console.log(isAdminLogin);
  if (!isAdminLogin)
    return res.status(400).json({ message: "somthing went wrong" });
  return res.status(200).json({ message: "Admin is log out" });
});

const createNewBondsman = asyncHandler(async (req: Request, res: Response) => {
  const { name, phoneNo, password, email, countryCode, address } = req.body as {
    name: string;
    phoneNo: string;
    password: string;
    email: string;
    countryCode: string;
    address: string;
  };
  const isAdmin = await Admin.findById(req.user?._id);
  if (!isAdmin)
    return res.status(403).json({ message: "only admin can allow this route" });
  const isBondsmanExist = await Bondsman.findOne({
    $or: [
      {
        phoneNo: phoneNo,
      },
      { email: email },
    ],
  });
  if (isBondsmanExist)
    return res.status(404).json({ message: "Bondsman already exist" });
  if (!isValidData(name))
    return res.status(401).json({ message: "Invalid name" });
  if (!isValidPassword(password))
    return res.status(401).json({
      message:
        "Password must contain at least 1 uppercase, lowercase, number, and special character, and password should be upto 8 characters long",
    });
  if (!isValidEmail(email))
    return res.status(401).json({ message: "Invalid email" });
  if (!countryCode)
    return res
      .status(401)
      .json({ message: "Country code is empty or invalid" });

  const createBondsman = await Bondsman.create({
    name: name,
    phoneNo: phoneNo,
    password: password,
    email: email.toLowerCase(),
    countryCode: countryCode,
    address,
  });
  const isCreateBondsman = await Bondsman.findById(createBondsman?._id).select(
    "-password"
  );
  if (!isCreateBondsman)
    return res.status(500).json({ message: "Bondsman not created try again" });
  return res
    .status(200)
    .json({ message: "New bondsman created", isCreateBondsman });
});

const adminLoginAsBondsman = asyncHandler(
  async (req: Request, res: Response) => {
    const { bondsmanId } = req.params;
    const isAdmin = await Admin.findById(req.user?._id);
    if (!isAdmin)
      return res
        .status(403)
        .json({ message: "only admin can allow this route" });
    const isBondsmanExist = await Bondsman.findById(bondsmanId);
    if (!isBondsmanExist)
      return res.status(404).json({ message: "Bondsman not found" });
    const accessToken = isBondsmanExist.generateAccessToken();
    const refreshToken = isBondsmanExist.generateRefreshToken();
    isBondsmanExist.refreshToken = refreshToken;
    await isBondsmanExist.save({ validateBeforeSave: false });
    return res.status(200).json({
      message: "Admin is logged in as bondsman",
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  }
);

const adminLogoutAsBondsman = asyncHandler(
  async (req: Request, res: Response) => {
    await Bondsman.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          refreshToken: "",
        },
      },
      {
        new: true,
      }
    );
    return res.status(200).json({ message: "Admin is logged out as bondsman" });
  }
);

const uploadAds = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await Admin.findById(req.user?._id);
  if (!isAdmin)
    return res
      .status(400)
      .json({ message: "Only admin allow for uploading images" });
  if (!req.file?.buffer)
    return res.status(404).json({ message: "Image not found for uploading" });

  const uploadAd = await uploadToCloudinary(req.file?.buffer);
  if (!uploadAd)
    return res
      .status(500)
      .json({ message: "Error occur during uploading image" });

  const isAdminExist = await Admin.findByIdAndUpdate(
    isAdmin.id,
    {
      $push: {
        adImg: {
          url: uploadAd.secure_url,
        },
      },
    },
    {
      new: true,
    }
  );

  const accessToken = isAdmin.generateAccessToken();
  const resp = {
    username: isAdminExist?.username,
    img: isAdminExist?.adImg,
    accessToken: accessToken,
  };
  return res.status(200).json({ message: "Ad uploaded", resp });
});

const getAllAds = asyncHandler(async (req: Request, res: Response) => {
  const getAllAds = await Admin.find({ role: "admin" }).select("adImg");
  if (!getAllAds) return res.status(404).json({ message: "No ad found" });
  return res
    .status(200)
    .json({ message: `${getAllAds[0].adImg.length} Ad found`, getAllAds });
});

const deleteAd = asyncHandler(async (req: Request, res: Response) => {
  const { adId } = req.params;
  if (!adId) return res.status(401).json({ message: "Ad id can't be empty" });
  const isAdExist = await Admin.findOne({ "adImg._id": adId });
  if (!isAdExist) return res.status(404).json({ message: "Ad is not found" });
  const isDeleteAd = await Admin.findByIdAndUpdate(
    req.user?._id,
    {
      $pull: {
        adImg: {
          _id: adId,
        },
      },
    },
    {
      new: true,
    }
  );
  console.log("isDeleteAd", isDeleteAd);
  const isDeleteAdSuccess = await Admin.findById(isDeleteAd?._id).select(
    "adImg username email createdAt updatedAt"
  );
  if (!isDeleteAdSuccess)
    return res
      .status(400)
      .json({ message: "Internal server error occur during deletion" });
  if (!isDeleteAdSuccess)
    return res.status(500).json({ message: "error occur during ad deletion" });
  const accessToken = isDeleteAdSuccess.generateAccessToken();
  return res.status(200).json({
    message: "Ad delete success",
    isDeleteAdSuccess,
    accessToken: accessToken,
  });
});

const addNewBondsman = asyncHandler(async (req: Request, res: Response) => {
  const { bondsmanId } = req.params;
  const isAdmin = await Admin.findById(req.user?._id);
  if (!isAdmin)
    return res.status(403).json({ message: "only admin can allow this route" });
  const isBondsmanExist = await Bondsman.find({
    _id: bondsmanId,
    isActive: false,
  });
  console.log("isBondsmanExist", isBondsmanExist);

  if (isBondsmanExist.length === 0)
    return res.status(404).json({ message: "Bondsman not exist" });
  const isBondsmanAdd = await Bondsman.findByIdAndUpdate(
    bondsmanId,
    {
      $set: {
        isActive: true,
      },
    },
    {
      new: true,
    }
  );
  const isBondsmanAddSuccess = await Bondsman.findById(
    isBondsmanAdd?._id
  ).select("-password");
  if (!isBondsmanAddSuccess)
    return res.status(500).json({ message: "Internal server error occur" });
  return res
    .status(200)
    .json({ message: "Bondsman Add success", isBondsmanAddSuccess });
});

const removeBondsman = asyncHandler(async (req: Request, res: Response) => {
  const { bondsmanId } = req.params;
  const isAdmin = await Admin.findById(req.user?._id);
  if (!isAdmin)
    return res.status(403).json({ message: "only admin can allow this route" });
  const isBondsmanExist = await Bondsman.find({
    _id: bondsmanId,
    isActive: true,
  });
  console.log("isBondsmanExist", isBondsmanExist);

  if (isBondsmanExist.length === 0)
    return res.status(404).json({ message: "Bondsman not exist" });
  const isBondsmanRemove = await Bondsman.findByIdAndUpdate(
    bondsmanId,
    {
      $set: {
        isActive: false,
      },
    },
    {
      new: true,
    }
  );
  const isBondsmanRemoveSuccess = await Bondsman.findById(
    isBondsmanRemove?._id
  ).select("-password");
  if (!isBondsmanRemoveSuccess)
    return res.status(500).json({ message: "Internal server error occur" });
  return res
    .status(200)
    .json({ message: "Bondsman remove success", isBondsmanRemoveSuccess });
});

const listAllActiveBondsman = asyncHandler(
  async (req: Request, res: Response) => {
    const isAdmin = await Admin.findById(req.user?._id);
    if (!isAdmin)
      return res
        .status(403)
        .json({ message: "only admin can allow this route" });
    const listAllBondsman = await Bondsman.find({ isActive: true })
      .select("-password")
      .populate("user", "_id firstName middleName lastName email phoneNo");
    if (listAllBondsman.length === 0)
      return res.status(404).json({ message: "No active bondsman found" });
    return res.status(200).json({
      message: `${listAllBondsman.length} Active bondsman found`,
      listAllBondsman,
    });
  }
);

const getBondsmanDetails = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await Admin.findById(req.user?._id);
  if (!isAdmin)
    return res.status(403).json({ message: "only admin can allow this route" });
  const isBondsmanAllExist = await Bondsman.find({})
    .select("-password")
    .populate(
      "user",
      "_id firstName middleName lastName email phoneNo countryCode"
    );

  if (isBondsmanAllExist.length === 0)
    return res.status(200).json({ message: "No bondsman found" });
  return res.status(200).json({
    message: `${isBondsmanAllExist.length} Bondsman found`,
    isBondsmanAllExist,
  });
});

const getTotalBondsmanCount = asyncHandler(
  async (req: Request, res: Response) => {
    const isAdmin = await Admin.findById(req.user?._id);
    if (!isAdmin)
      return res
        .status(403)
        .json({ message: "only admin can allow this route" });

    const totalCount = await Bondsman.countDocuments();
    return res.status(200).json({ message: `${totalCount} Bondsman found` });
  }
);

const getTotalUsersCount = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await Admin.findById(req.user?._id);
  if (!isAdmin)
    return res.status(403).json({ message: "only admin can allow this route" });

  const totalCount = await User.countDocuments();
  return res
    .status(200)
    .json({ message: `${totalCount} User found`, count: totalCount });
});

const verifyToken = asyncHandler(async (req: Request, res: Response) => {
  if (req.user?._id) {
    return res.status(200).json({ authenticated: true, user: req.user });
  }
  return res.status(200).json({ authenticated: false });
});

const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await Admin.findById(req.user?._id);
  if (!isAdmin)
    return res.status(403).json({ message: "only admin can allow this route" });
  const allUsers = await User.find({}).select("-password -refreshToken");
  if (allUsers.length === 0)
    return res.status(200).json({ message: "No data found" });
  return res.status(200).json({ messag: "All users get", User: allUsers });
});

const deleteUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await Admin.findById(req.user?._id);
  if (!isAdmin)
    return res.status(403).json({ message: "only admin can allow this route" });
  const { id } = req.params;
  const deletedUserInfo = await User.deleteOne({ _id: id });

  if (deletedUserInfo.deletedCount !== 1)
    return res
      .status(401)
      .json({ message: "User profile can't be deleted", deletedUserInfo });
  return res
    .status(200)
    .json({ message: "User profile deleted", deletedUserInfo });
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

const updateBondsmanDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const isAdmin = await Admin.findById(req.user?._id);
    if (!isAdmin)
      return res
        .status(403)
        .json({ message: "only admin can allow this route" });
    const { bondsmanId } = req.params;
    if (!bondsmanId)
      return res.status(400).json({ message: "Bondsman Id is empty" });
    const { name, email, phoneNo, countryCode } = req.body as {
      name: string;
      email: string;
      phoneNo: string;
      countryCode: string;
    };
    if (!name.trim() || !email.trim() || !phoneNo.trim() || !countryCode.trim())
      return res.status(400).json({ message: "Fields can't be empty" });

    if (!isValidData(name))
      return res.status(400).json({ message: "Invalid name" });
    if (!isValidEmail(email))
      return res.status(400).json({ message: "Invalid email" });

    const updatedBondsman = await Bondsman.findByIdAndUpdate(
      bondsmanId,
      {
        $set: {
          name,
          email,
          phoneNo,
          countryCode,
        },
      },
      {
        new: true,
      }
    );

    if (!updatedBondsman)
      return res.status(500).json({ message: "Data couldn't update" });
    return res
      .status(200)
      .json({ message: "Bondsman data updated", updatedBondsman });
  }
);

const updateUserDetails = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await Admin.findById(req.user?._id);
  if (!isAdmin)
    return res.status(403).json({ message: "only admin can allow this route" });
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ message: "User Id is empty" });

  const {
    firstName,
    middleName,
    lastName,
    email,
    phoneNo,
    // homeAddress,
    // street,
    // ZipCode,
    countryCode,
    // isActive,
  } = req.body as {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email?: string;
    phoneNo?: string;
    // homeAddress?: string;
    // street?: string;
    // ZipCode?: string;
    countryCode?: string;
    // isActive?: boolean;
  };

  const updateFields: any = {};

  if (firstName !== undefined) {
    if (!firstName.trim())
      return res.status(400).json({ message: "First name can't be empty" });
    if (!isValidData(firstName))
      return res.status(400).json({ message: "Invalid first name" });
    updateFields.firstName = firstName.trim();
  }

  if (middleName !== undefined) {
    if (!middleName.trim())
      return res.status(400).json({ message: "Middle name can't be empty" });
    if (!isValidData(middleName))
      return res.status(400).json({ message: "Invalid middle name" });
    updateFields.middleName = middleName.trim();
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

  // if (homeAddress !== undefined) {
  //   if (!homeAddress.trim())
  //     return res.status(400).json({ message: "Home address can't be empty" });
  //   updateFields.homeAddress = homeAddress.trim();
  // }

  // if (street !== undefined) {
  //   if (!street.trim())
  //     return res.status(400).json({ message: "Street can't be empty" });
  //   updateFields.street = street.trim();
  // }

  // if (ZipCode !== undefined) {
  //   if (!ZipCode.trim())
  //     return res.status(400).json({ message: "Zip code can't be empty" });
  //   updateFields.ZipCode = ZipCode.trim();
  // }

  if (countryCode !== undefined) {
    if (!countryCode.trim())
      return res.status(400).json({ message: "Country code can't be empty" });
    updateFields.countryCode = countryCode.trim();
  }

  // if (isActive !== undefined) {
  //   updateFields.isActive = isActive;
  // }

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
});

const createContactUs = asyncHandler(async (req: Request, res: Response) => {
  const { text } = req.body;

  if (!text || !text.trim())
    return res.status(400).json({ message: "Text is required" });

  const userId = req.user?._id;

  // CHECK ADMIN
  let role: "Admin" | "Bondsman" = "Admin";

  const isAdmin = await Admin.findById(userId);
  if (isAdmin) role = "Admin";
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
  let role: "Admin" | "Bondsman" = "Admin";

  const isAdmin = await Admin.findById(userId);
  if (isAdmin) role = "Admin";

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
    let role: "Admin" | "Bondsman" = "Admin";

    const isAdmin = await Admin.findById(userId);
    if (isAdmin) role = "Admin";
    console.log({ role });
    // Delete only same-role previous entries
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
  let role: "Admin" | "Bondsman" = "Admin";

  const isAdmin = await Admin.findById(userId);
  if (isAdmin) role = "Admin";
  
  const privacyPolicy = await PrivacyPolicy.findOne({ role })

  if (!privacyPolicy)
    return res
      .status(404)
      .json({ message: "Privacy policy content not found" });

  return res
    .status(200)
    .json({ message: "Privacy policy content retrieved", privacyPolicy });
});

export {
  adminSignUp,
  adminLogin,
  adminLogout,
  adminLoginAsBondsman,
  adminLogoutAsBondsman,
  uploadAds,
  getAllAds,
  deleteAd,
  createNewBondsman,
  addNewBondsman,
  removeBondsman,
  listAllActiveBondsman,
  getBondsmanDetails,
  getTotalBondsmanCount,
  getTotalUsersCount,
  verifyToken,
  getAllUsers,
  deleteUserProfile,
  deleteBondsmanProfile,
  updateBondsmanDetails,
  updateUserDetails,
  createContactUs,
  getContactUs,
  createPrivacyPolicy,
  getPrivacyPolicy,
};
