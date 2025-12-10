import mongoose, { Schema, Document } from "mongoose";

export interface IReminderNotification extends Document {
  user: mongoose.Types.ObjectId;
  reminderId: mongoose.Types.ObjectId;
  deviceToken: string;
  title: string;
  body: string;
  status: "pending" | "sent" | "failed";
  sentAt?: Date;
  error?: string | null;
  retries: number;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

const ReminderNotificationSchema = new Schema<IReminderNotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reminderId: { type: Schema.Types.ObjectId, ref: "Reminder", required: true },
    deviceToken: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    status: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
    sentAt: { type: Date },
    error: { type: String, default: null },
    retries: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} }, // store extra info like reminderDate, reminderTime, note
  },
  { timestamps: true }
);

export const ReminderNotification = mongoose.model<IReminderNotification>(
  "ReminderNotification",
  ReminderNotificationSchema
);
