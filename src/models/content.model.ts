import { Schema, model, Document } from "mongoose";

//  --------------------- Contact Us Information --------------------
interface IContactUs extends Document {
  text: string;
  createdBy: Schema.Types.ObjectId; // Admin or Bondsman _id
  role: "Admin" | "Bondsman"; // EXACTLY these two values
}

//  --------------------- Privacy Policy Information --------------------
interface IPrivacyPolicy extends Document {
  text: string;
  createdBy: Schema.Types.ObjectId; // Admin or Bondsman _id
  role: "Admin" | "Bondsman"; // EXACTLY these two values
}

//  --------------------- Contact Us Schema --------------------
const ContactUsSchema = new Schema<IContactUs>(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      refPath: "role", // Dynamically reference Admin OR Bondsman
      required: true,
    },
    role: {
      type: String,
      enum: ["Admin", "Bondsman"], // EXACT model names
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

//  --------------------- Privacy Policy Schema --------------------
const PrivacyPolicySchema = new Schema<IPrivacyPolicy>(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      refPath: "role", // Dynamically reference Admin OR Bondsman
      required: true,
    },
    role: {
      type: String,
      enum: ["Admin", "Bondsman"], // EXACT model names
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const ContactUs = model("ContactUs", ContactUsSchema, "contactus");
export const PrivacyPolicy = model(
  "PrivacyPolicy",
  PrivacyPolicySchema,
  "privacy"
);
