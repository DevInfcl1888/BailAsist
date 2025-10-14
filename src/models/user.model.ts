import { Schema, model, Document } from "mongoose";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";

interface userModel {
  name: string;
  surname: string;
  streetName: string;
  homeAddress: string;
  workPlace: string;
  workPlaceAddress: string;
  vehicalInfo: { model: string; vehicalNumber: string }[];
  vehicalColor: string;
  tags: string[];
  partnerAddress: string;
  email: string;
  password: string;
  phoneNo: string;
  refreshToken: string;
  isAgreed: boolean;
  isCorrectPassword(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

const userSchema: Schema<userModel> = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  surname: {
    type: String,
    required: true,
    trim: true,
  },
  streetName: {
    type: String,
    required: true,
  },
  homeAddress: {
    type: String,
    required: true,
  },
  workPlace: {
    type: String,
    required: true,
  },
  workPlaceAddress: {
    type: String,
    required: true,
  },
  vehicalInfo: [
    {
      model: { type: String, required: true },
      vehicalNumber: { type: String, required: true },
    },
  ],
  vehicalColor: {
    type: String,
    required: true,
    trim: true,
  },
  tags: [
    {
      type: String,
      required: true,
    },
  ],
  partnerAddress: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    lowercase: true,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  phoneNo: {
    type: String,
    required: true,
  },
  refreshToken: {
    type: String,
  },
  isAgreed: {
    type: Boolean,
    default:false,
    required: true,
  },
});

// This is middleware for encrypt password only when password is changed
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  }
});

// This function use for check password is correct or not
userSchema.methods.isCorrectPassword = async function (password: string) {
  return await bcrypt.compare(password, this.password);
};

// This function use for generate access token
userSchema.methods.generateAccessToken = function (): string {
  const secret = process.env.ACCESS_TOKEN_KEY!;
  const expiresIn = process.env.ACCESS_TOKEN_EXPIRE!;
  if (!secret || !expiresIn) throw Error("JWT Error...!");

  const payload = {
    _id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phoneNo,
  };
  const options: SignOptions = {
    algorithm: "HS256",
  };

  return jwt.sign(payload, secret, options);
};

// This function use for generate access token
userSchema.methods.generateRefreshToken = function (): string {
  const secret = process.env.REFRESH_TOKEN_KEY!;
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRE!;
  if (!secret || !expiresIn) throw Error("JWT Error...!");

  const payload = {
    _id: this._id,
  };
  const options: SignOptions = {
    algorithm: "HS256",
  };

  return jwt.sign(payload, secret, options);
};

export const User = model("User", userSchema);
