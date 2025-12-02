import { Schema, model, Document } from "mongoose";

//  --------------------- Contact Us Information --------------------
interface IContactUs extends Document {
    text: string;
}

//  --------------------- Privacy Policy Information --------------------
interface IPrivacyPolicy extends Document {
    text: string;
}

//  --------------------- Contact Us Schema --------------------
const ContactUsSchema = new Schema<IContactUs>(
    {
        text: {
            type: String,
            required: true,
            trim: true,
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
    },
    {
        timestamps: true,
    }
);

export const ContactUs = model("ContactUs", ContactUsSchema, "contactus");
export const PrivacyPolicy = model("PrivacyPolicy", PrivacyPolicySchema, "privacy");

