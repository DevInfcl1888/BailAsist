import cron from "node-cron";
import { User } from "../models/user.model.js";
import { sendEmail } from "../utils/twilio.js";

// Track recently notified users to prevent duplicate emails (userId -> timestamp)
// const recentlyNotifiedUsers = new Map<string, number>();
// const NOTIFICATION_COOLDOWN = 5 * 60 * 60 * 1000; // 5 hour
// Run every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  console.log("🕐 Running user activity check job...");

  try {
    const now = new Date();
    // 5 Hours in milliseconds
    const fiveHoursMs = 5 * 60 * 60 * 1000;

    const fiveHoursAgo = new Date(now.getTime() - fiveHoursMs);

    const inactiveUsers = await User.find({
      isActive: true,
      latitude: { $exists: true, $ne: null },
      latUpdatedAt: { $lte: fiveHoursAgo }, 
      $or: [
        { lastInactivityEmailSentAt: { $exists: false } }, 
        { lastInactivityEmailSentAt: null }, 
        { lastInactivityEmailSentAt: { $lte: fiveHoursAgo } }, 
      ],
    });
    if (inactiveUsers.length === 0) {
      console.log(
        "✅ No inactive users found (all users updated within last 5 minutes)"
      );
      return;
    }

    console.log(`⚠️ Found ${inactiveUsers.length} inactive user(s)`);
    for (const user of inactiveUsers) {
      if (!user.email) {
        console.log(`⚠️ Skipping user ${user._id} - no email address`);
        continue;
      }

      try {
        const emailSubject = "Inactivity Alert - BailAsist";
        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Inactivity Alert</h2>
            <p>Dear ${user.firstName} ${
          user.lastName || user.middleName || " "
        },</p>
            <p>We noticed that you haven't been active on the BailAsist platform for more than 5 minutes.</p>
            <p>Please ensure you are active and update your location if needed.</p>
            <p>If you have any questions or concerns, please contact support.</p>
            <br>
            <p>Best regards,<br>BailAssist Team</p>
          </div>
        `;

        const emailSent = await sendEmail(user.email, emailSubject, emailBody);

        if (emailSent) {
          console.log(`✅ Email sent to ${user.email}`); // Track that we've notified this user
          await User.findByIdAndUpdate(user._id, {
            $set: { lastInactivityEmailSentAt: new Date() },
          });
        } else {
          console.error(`❌ Failed to send inactivity email to ${user.email}`);
        }
      } catch (error) {
        console.error(`❌ Error sending email to ${user.email}:`, error);
      }
    }

    console.log(
      `✅ User activity check completed. Processed ${inactiveUsers.length} user(s).`
    );
  } catch (err) {
    console.error("❌ User activity check job failed:", err);
  }
});
