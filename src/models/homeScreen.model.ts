import { Schema, model, Document } from "mongoose";

// ------- Interfaces and enums -------
interface IAgency extends Document {
  name: string;
  phoneNo: string;
  email: string;
  agentName: string;
  address: string;
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
const AgencySchema = new Schema<IAgency>(
  {
    name: { type: String, required: true, trim: true },
    phoneNo: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    agentName: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
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
      userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
      photoUrl: { type: String, required: true }, // cloudinary img url
      message: { type: String, trim: true },
      location: { type: String, required: true },
    },
  },
  {
    timestamps: true,
  }
);

const CheckInProofSchema = new Schema<ICheckInProof>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    photoUrl: { type: String, required: true },
    message: { type: String },
    location: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

// const CourtDateSchema = new Schema() < ICourtDate > {};
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

const Agency = model("Agency", AgencySchema);
const CheckIn = model("CheckIn", CheckInSchema);
const CheckInProof = model("CheckInProof", CheckInProofSchema);
const Court = model("Court", CourtSchema);

export default { Agency, CheckIn, Court, CheckInProof };
