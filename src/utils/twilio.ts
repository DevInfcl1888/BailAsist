import twilio from "twilio";
import nodemailer from "nodemailer";

// Check if Twilio credentials are available
const hasTwilioCredentials =
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client only if credentials are available
const client = hasTwilioCredentials
    ? twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
    : null;

// Check if email credentials are available
const hasEmailCredentials =
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS;

// Initialize nodemailer transporter if credentials are available
const getEmailTransporter = () => {
    if (!hasEmailCredentials) return null;

    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

export const sendSMS = async (to: string, body: string, email?: string) => {
    // Try Twilio first if credentials are available
    if (hasTwilioCredentials && client) {
        try {
            await client.messages.create({
                body,
                from: process.env.TWILIO_PHONE_NUMBER!,
                to,
            });
            console.log(`📩 SMS sent to ${to}`);
            return;
        } catch (error) {
            console.error("❌ Twilio Error:", error);
            // Fall through to email fallback if Twilio fails
        }
    }

    // Fallback to email if Twilio is not available or failed
    if (email && hasEmailCredentials) {
        try {
            const transporter = getEmailTransporter();
            if (transporter) {
                await transporter.sendMail({
                    from: `${process.env.FROM_NAME || "BailAsist"} <${process.env.EMAIL_USER}>`,
                    to: email,
                    subject: "Important Notification",
                    html: `<p>${body}</p>`,
                });
                console.log(`📧 Email sent to ${email} (SMS fallback)`);
                return;
            }
        } catch (error) {
            console.error("❌ Email Error:", error);
        }
    }

    // If both Twilio and email failed or are unavailable
    if (!hasTwilioCredentials && !hasEmailCredentials) {
        console.error("❌ Neither Twilio credentials nor Email credentials are available. Cannot send message.");
    } else if (!email && !hasTwilioCredentials) {
        console.error("❌ Twilio credentials not available and no email provided. Cannot send message.");
    }
};
