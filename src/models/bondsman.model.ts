import { Schema, model, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";

// ------- Interfaces and enums -------
interface IBondsman extends Document {
  name: string;
  phoneNo: string;
  address: string;
  email: string;
  password: string;
  confirmPassword: string;
  countryCode: string;
  deviceToken?: string;
  user: Types.ObjectId[];
  isActive: boolean;
  refreshToken?: string;
  isCorrectPassword(password: string): Promise<Boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

export enum Status {
  Done = "Done",
  Pending = "Pending",
}

interface ICourt extends Document {
  courtName: string;
  addressLine: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  courtContactNo: string;
  courtEmail: string;
  reminders: Schema.Types.ObjectId[];
}

interface ICourtReminder extends Document {
  user: Schema.Types.ObjectId;
  court: Schema.Types.ObjectId;
  roomNumber: string;
  reminderDate: string;
  reminderTime: string;
  reminderDateTime: Date;
  reminderNote?: string;
  status: string;
  interval: string;
  isActive: boolean;
}
// ------- Schemas -------
const BondsmanSchema = new Schema<IBondsman>(
  {
    name: { type: String, required: true, trim: true },
    phoneNo: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    password: { type: String, required: true, trim: true },
    confirmPassword: { type: String, trim: true },
    email: { type: String, required: true, trim: true },
    countryCode: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    user: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const CourtSchema = new Schema<ICourt>(
  {
    courtName: {
      type: String,
      trim: true,
      required: true,
    },
    addressLine: {
      type: String,
      trim: true,
      required: true,
    },
    city: {
      type: String,
      trim: true,
      required: true,
    },
    state: {
      type: String,
      trim: true,
      required: true,
    },
    country: {
      type: String,
      trim: true,
      required: true,
    },
    zipCode: {
      type: String,
      trim: true,
      required: true,
    },
    courtContactNo: {
      type: String,
      trim: true,
      required: true,
    },
    courtEmail: {
      type: String,
      trim: true,
      unique: true,
      required: true,
    },
    reminders: [{ type: Schema.Types.ObjectId, ref: "Reminder" }],
  },
  {
    timestamps: true,
  }
);

const ReminderSchema = new Schema<ICourtReminder>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    court: { type: Schema.Types.ObjectId, ref: "Court", required: true },
    roomNumber: { type: String },
    reminderDate: { type: String, required: true }, // YYYY-MM-DD
    reminderTime: { type: String, required: true }, // HH:mm
    reminderDateTime: {
      type: Date,
      required: true,
    },
    reminderNote: { type: String },
    status: {
      type: String,
    },
    interval: {
      type: String,
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// This is middleware for encrypt password only when password is changed
BondsmanSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  }
});

// This function use for check password is correct or not
BondsmanSchema.methods.isCorrectPassword = async function (password: string) {
  return await bcrypt.compare(password, this.password);
};

// This function use for generate access token
BondsmanSchema.methods.generateAccessToken = function (): string {
  const secret = process.env.ACCESS_TOKEN_KEY!;
  const accessTokenExpiresIn = process.env.ACCESS_TOKEN_EXPIRE!;
  if (!secret || !accessTokenExpiresIn) throw Error("JWT Error...!");
  let expiresIn: number;
  if (accessTokenExpiresIn.endsWith("h")) {
    expiresIn = parseInt(accessTokenExpiresIn) * 60 * 60; // hours → seconds
  } else if (accessTokenExpiresIn.endsWith("m")) {
    expiresIn = parseInt(accessTokenExpiresIn) * 60; // minutes → seconds
  } else {
    expiresIn = parseInt(accessTokenExpiresIn); // assume seconds
  }
  const payload = {
    _id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phoneNo,
  };
  const options: SignOptions = {
    algorithm: "HS256",
    expiresIn,
  };

  return jwt.sign(payload, secret, options);
};

// This function use for generate access token
BondsmanSchema.methods.generateRefreshToken = function (): string {
  const secret = process.env.REFRESH_TOKEN_KEY!;
  const refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRE!;
  if (!secret || !refreshTokenExpiresIn) throw Error("JWT Error...!");
  let expiresIn: number;
  if (refreshTokenExpiresIn.endsWith("h")) {
    expiresIn = parseInt(refreshTokenExpiresIn) * 60 * 60; // hours → seconds
  } else if (refreshTokenExpiresIn.endsWith("m")) {
    expiresIn = parseInt(refreshTokenExpiresIn) * 60; // minutes → seconds
  } else if (refreshTokenExpiresIn.endsWith("d")) {
    expiresIn = parseInt(refreshTokenExpiresIn) * 24 * 60 * 60; // minutes → seconds
  } else {
    expiresIn = parseInt(refreshTokenExpiresIn); // assume seconds
  }
  const payload = {
    _id: this._id,
  };
  const options: SignOptions = {
    expiresIn,
    algorithm: "HS256",
  };

  return jwt.sign(payload, secret, options);
};

export const Bondsman = model("Bondsman", BondsmanSchema);
export const Court = model("Court", CourtSchema);
export const Reminder = model("Reminder", ReminderSchema);
