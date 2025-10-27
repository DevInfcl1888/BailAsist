import { Schema, model, Document } from "mongoose";

// ------- Interface -------
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
}

interface ICourtDate extends Document {
  userId: Schema.Types.ObjectId;
  courtName: string;
  address: string;
  type: string;
  date: Date;
}

// ------- Schemas -------
const AgencySchema = new Schema<IAgency>({
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
});

const CheckInSchema = new Schema<ICheckIn>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  lastCheckedInAt: {
    date: { type: Date, required: true },
    status: { type: String, enum: Object.values(Status), default: Status.Done },
  },
  nextCheckInDate: {
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(Status),
      default: Status.Pending,
    },
  },
});

const CourtDateSchema = new Schema<ICourtDate>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  courtName: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  type: { type: String, required: true, trim: true }, // e.g., "Arraignment", "Trial"
  date: { type: Date, required: true },
});

const Agency = model("Agency", AgencySchema);
const CheckIn = model("CheckIn", CheckInSchema);
const CourtDate = model("CourtDate", CourtDateSchema);

export default { Agency, CheckIn, CourtDate };
