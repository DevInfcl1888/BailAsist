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
  userId: Schema.Types.ObjectId;
  nextCheckInDate: Date;
  lastCheckedInAt?: Date;
  status: Status;
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
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  nextCheckInDate: { type: Date, required: true },
  lastCheckedInAt: { type: Date },
  status: {
    type: String,
    enum: Object.values(Status),
    default: Status.Pending,
  },
});

// CheckIn model method (Mongoose)
CheckInSchema.methods.checkIn = async function (intervalDays: number = 7) {
  const now = new Date();

  this.lastCheckedInAt = now;
  this.nextCheckInDate = new Date(
    now.getTime() + intervalDays * 24 * 60 * 60 * 1000
  );
  this.Status;

  await this.save();
  return this;
};

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
