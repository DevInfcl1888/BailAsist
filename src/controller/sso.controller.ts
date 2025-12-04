import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Request, Response } from "express";

const ssoLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, given_name, family_name, name, picture, subId, authProvider } =
    req.body as {
      email: string;
      given_name: string;
      family_name: string;
      name: string;
      picture: string;
      subId: string;
      authProvider: string;
    };

  if (!email || !subId) {
    return res.status(400).json({ message: "email & subId missing" });
  }

  const normalizeEmail = email.toLowerCase();

  let user = await User.findOne({ email: normalizeEmail });
  if (user) {
    if (!user.authProvider)
      return res.status(400).json({ message: "Use manual login" });
    if (user.subId !== subId) {
      return res.status(200).json({ message: "please sign up first" });
    }
  }
  if (!user) {
    user = await User.create({
      firstName: given_name, // actual name
      middleName: family_name, // last name or surname
      lastName: "",
      email: normalizeEmail,
      phoneNo: "",
      countryCode: "",
      homeAddress: "",
      street: "",
      ZipCode: "",
      //   deviceToken: deviceToken ? deviceToken : "",
      subId,
      SSOimg: picture,
      password: null,
      isAgreed: true,
      authProvider
    });
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save();
  return res.status(200).json({
    message: user ? "Login successful" : "User registered & logged in",
    data: { accessToken, refreshToken },
  });
});

export { ssoLogin };
