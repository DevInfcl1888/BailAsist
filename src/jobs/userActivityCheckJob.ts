import cron from "node-cron";
import { User } from "../models/user.model.js";
import { sendEmail } from "../utils/twilio.js";

// Track recently notified users to prevent duplicate emails (userId -> timestamp)
const recentlyNotifiedUsers = new Map<string, number>();
const NOTIFICATION_COOLDOWN = 5 * 60 * 1000; // 1 hour in milliseconds

// Run every 5 minutes
cron.schedule("*/1 * * * *", async () => {
  console.log("🕐 Running user activity check job...");

  try {
    // Calculate the time 5 minutes ago
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000); // 1 min

    // Find users with latitude and longitude whose updatedAt is older than 5 minutes
    const inactiveUsers = await User.find({
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null },
      latUpdatedAt: { $lte: tenMinutesAgo }, // if latitude and longitude is not updated. latUpdatedAt stay same.
      isActive: true, // Only check active users
    });
    if (inactiveUsers.length === 0) {
      console.log(
        "✅ No inactive users found (all users updated within last 5 minutes)"
      );
      return;
    }

    console.log(`⚠️ Found ${inactiveUsers.length} inactive user(s)`);
    // Send email to each inactive user
    for (const user of inactiveUsers) {
      if (!user.email) {
        console.log(`⚠️ Skipping user ${user._id} - no email address`);
        continue;
      }

      // Check if we've notified this user recently (within the last hour)
      const userId = user._id.toString();
      const lastNotificationTime = recentlyNotifiedUsers.get(userId);
      const now = Date.now();

      if (
        lastNotificationTime &&
        now - lastNotificationTime < NOTIFICATION_COOLDOWN
      ) {
        const minutesSinceLastNotification = Math.floor(
          (now - lastNotificationTime) / 60000
        );
        console.log(
          `⏭️ Skipping ${user.email} - already notified ${minutesSinceLastNotification} minutes ago`
        );
        continue;
      }

      try {
        const emailSubject = "Inactivity Alert - BailAsist";
        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Inactivity Alert</h2>
            <p>Dear ${user.firstName} ${user.lastName},</p>
            <p>We noticed that you haven't been active on the BailAsist platform for more than 5 minutes.</p>
            <p>Please ensure you are active and update your location if needed.</p>
            <p>If you have any questions or concerns, please contact support.</p>
            <br>
            <p>Best regards,<br>BailAssist Team</p>
          </div>
        `;

        const emailSent = await sendEmail(user.email, emailSubject, emailBody);

        if (emailSent) {
          console.log(`✅ Inactivity email sent to ${user.email}`);
          // Track that we've notified this user
          recentlyNotifiedUsers.set(userId, now);
        } else {
          console.error(`❌ Failed to send inactivity email to ${user.email}`);
        }
      } catch (error) {
        console.error(`❌ Error sending email to ${user.email}:`, error);
      }
    }

    // Clean up old entries from the cache (older than 1 hour)
    for (const [userId, timestamp] of recentlyNotifiedUsers.entries()) {
      if (Date.now() - timestamp > NOTIFICATION_COOLDOWN) {
        recentlyNotifiedUsers.delete(userId);
      }
    }

    console.log(
      `✅ User activity check completed. Processed ${inactiveUsers.length} user(s).`
    );
  } catch (err) {
    console.error("❌ User activity check job failed:", err);
  }
});
