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
  user: Array<{
    name: Types.ObjectId;
    phone: string;
  }>;
  isCorrectPassword(password: string): Promise<Boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
  // email: string;
  // address: string;
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
  checkInProof: ICheckInProof;
}

interface ICheckInProof extends Document {
  userId: Schema.Types.ObjectId;
  photoUrl: string;
  message: string;
  location: string;
}
export enum courtTypes {
  HIGH_COURT = "High Court",
  DISTRICT_COURT = "District Court",
  CIVIL_COURT = "Civil Court",
  SUPREME_COURT = "Supreme Court",
}

export enum courtLevel {
  NATIONAL = "National",
  STATE = "State",
  DISTRICT = "District", // Optional, based on hierarchy
}

interface ICourt extends Document {
  courtName: string;
  courtType: string;
  level: string;
  addressLine: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  courtContactNo: string;
  courtEmail: string;
}

// ------- Schemas -------
const BondsmanSchema = new Schema<IBondsman>(
  {
    name: { type: String, required: true, trim: true },
    phoneNo: { type: String, required: true, trim: true },
    password: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    deviceToken: { type: String, trim: true },
    countryCode: { type: String, trim: true },
    user: [
      {
        name: {
          type: Schema.Types.ObjectId,
          ref: "User",
          trim: true,
          required: true,
        },
        phone: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
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
  },
  {
    timestamps: true,
  }
);

const CheckInProofSchema = new Schema<ICheckInProof>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    photoUrl: { type: String, required: true }, // cloudinary url
    message: { type: String, trim: true },
    location: { type: String, required: true },
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
    courtType: {
      type: String,
      enum: Object.values(courtTypes),
      trim: true,
      required: true,
    },
    level: {
      type: String,
      enum: Object.values(courtLevel),
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

const Bondsman = model("Bondsman", BondsmanSchema);
const CheckIn = model("CheckIn", CheckInSchema);
const CheckInProof = model("CheckInProof", CheckInProofSchema);
const Court = model("Court", CourtSchema);

export default { Bondsman, CheckIn, Court, CheckInProof };
