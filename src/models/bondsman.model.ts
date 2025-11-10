import { Schema, model, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";

// ------- Interfaces and enums -------
interface IBondsman extends Document {
  name: string;
  phoneNo: string;
  email: string;
  password: string;
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
interface ICheckIn extends Document {
  user: Schema.Types.ObjectId;
  lastCheckedInAt: {
    date: Date;
    status: Status;
  };
  nextCheckInDate: {
    date: Date;
    status: Status;
  };
  isActive: {
    type: boolean;
    default: true;
  };
  checkInProof: {
    userId: Schema.Types.ObjectId;
    photoUrl: string;
    message: string;
    location: string;
  };
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
  reminders: Schema.Types.ObjectId[]
}

export enum ReminderStatus {
  Active = "Active",
  Cancelled = "Cancelled",
  Completed = "Completed",
}

interface ICourtReminder extends Document {
  user: Schema.Types.ObjectId;
  court: Schema.Types.ObjectId;
  caseNumber: string;
  reminderDate: Date;
  reminderNote?: string;
  status: ReminderStatus;
  isActive: boolean;
}
// ------- Schemas -------
const BondsmanSchema = new Schema<IBondsman>(
  {
    name: { type: String, required: true, trim: true },
    phoneNo: { type: String, required: true, trim: true },
    password: { type: String, required: true, trim: true },
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

const CheckInSchema = new Schema<ICheckIn>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lastCheckedInAt: {
      date: { type: Date, required: true },
      status: {
        type: String,
        enum: Object.values(Status),
        default: Status.Done,
      },
    },
    nextCheckInDate: {
      date: { type: Date, required: true },
      status: {
        type: String,
        enum: Object.values(Status),
        default: Status.Pending,
      },
    },
    checkInProof: {
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      photoUrl: { type: String }, // cloudinary url
      message: { type: String, trim: true },
      location: { type: String },
    },
    isActive: {
      type: Boolean,
      default: true,
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
    caseNumber: { type: String, required: true },
    reminderDate: { type: Date, required: true },
    reminderNote: { type: String },
    status: {
      type: String,
      enum: Object.values(ReminderStatus),
      default: ReminderStatus.Active,
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
  const expiresIn = process.env.ACCESS_TOKEN_EXPIRE!;
  if (!secret || !expiresIn) throw Error("JWT Error...!");

  const payload = {
    _id: this._id,
    name: this.name,
    phone: this.phoneNo,
  };
  const options: SignOptions = {
    algorithm: "HS256",
  };

  return jwt.sign(payload, secret, options);
};

// This function use for generate access token
BondsmanSchema.methods.generateRefreshToken = function (): string {
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

export const Bondsman = model("Bondsman", BondsmanSchema);
export const CheckIn = model("CheckIn", CheckInSchema);
export const Court = model("Court", CourtSchema);
export const Reminder = model("Reminder", ReminderSchema);
