import { ReminderNotification } from "../models/notification.model.js";
import cron from "node-cron";
import { Reminder } from "../models/bondsman.model.js";
import { User } from "../models/user.model.js";
import { messaging } from "../config/firebase.js";

// Run every minute to check for reminders
cron.schedule("* * * * *", async () => {
  console.log("🕐 Running reminder notification job...");

  try {
    // Get all active reminders
    // Note: This sends notifications for all active reminders
    // You may want to filter by reminderDate and reminderTime if you only want to send for due reminders
    const reminders = await Reminder.find({
      isActive: true,
    });

    if (reminders.length === 0) {
      console.log("✅ No active reminders found");
      return;
    }

    console.log(`📋 Found ${reminders.length} active reminder(s)`);

    // Process each reminder
    for (const reminder of reminders) {
      try {
        // Check if reminder has a user
        if (!reminder.user) {
          console.log(
            `⚠️ Skipping reminder ${reminder._id} - no user associated`
          );
          continue;
        }

        // Get user ID from reminder
        const userId = reminder.user;

        // Find user in users collection by _id
        const user = await User.findById(userId).select(
          "deviceToken firstName lastName email"
        );

        if (!user) {
          console.log(
            `⚠️ Skipping reminder ${reminder._id} - user ${userId} not found`
          );
          continue;
        }

        // Check if user has a device token
        if (!user.deviceToken || user.deviceToken.trim() === "") {
          console.log(
            `⚠️ Skipping reminder ${reminder._id} - user ${userId} has no device token`
          );
          continue;
        }

        // Prepare notification content
        const notificationTitle = "Reminder - BailAsist";
        let notificationBody = "";

        // Build notification body based on reminder details
        if (reminder.reminderDate && reminder.reminderTime) {
          notificationBody = `Reminder scheduled for ${reminder.reminderDate} at ${reminder.reminderTime}`;
        } else if (reminder.reminderDate) {
          notificationBody = `Reminder scheduled for ${reminder.reminderDate}`;
        } else {
          notificationBody = "You have a reminder";
        }

        // Add note if available
        if (reminder.reminderNote && reminder.reminderNote.trim() !== "") {
          notificationBody += ` - ${reminder.reminderNote}`;
        }

        // Send push notification using FCM
        try {
          await messaging.send({
            token: user.deviceToken,
            notification: {
              title: notificationTitle,
              body: notificationBody,
            },
            data: {
              reminderId: reminder._id.toString(),
              userId: user._id.toString(),
              reminderDate: reminder.reminderDate || "",
              reminderTime: reminder.reminderTime || "",
              reminderNote: reminder.reminderNote || "",
              type: "reminder",
            },
          });

          console.log(
            `✅ Push notification sent for reminder ${reminder._id} to user ${user._id}`
          );

          await ReminderNotification.create({
            user: user._id,
            reminderId: reminder._id,
            deviceToken: user.deviceToken,
            title: notificationTitle,
            body: notificationBody,
            status: "sent",
            sentAt: new Date(),
            error: null,
            retries: 0,
            metadata: {
              reminderDate: reminder.reminderDate,
              reminderTime: reminder.reminderTime,
              reminderNote: reminder.reminderNote || "",
              type: "reminder",
            },
          });
        } catch (error: any) {
          const errCode = error?.errorInfo?.code;

          if (errCode === "messaging/registration-token-not-registered") {
            console.log(
              `🚫 Invalid device token for user ${user._id} - clearing token`
            );

            // Clear the invalid token from user
            await User.findByIdAndUpdate(user._id, {
              $set: { deviceToken: "" },
            });
          } else {
            console.error(
              `❌ Error sending push notification for reminder ${reminder._id}:`,
              errCode || error
            );
          }
        }
      } catch (error) {
        console.error(`❌ Error processing reminder ${reminder._id}:`, error);
      }
    }

    console.log(
      `✅ Reminder notification job completed. Processed ${reminders.length} reminder(s).`
    );
  } catch (err) {
    console.error("❌ Reminder notification job failed:", err);
  }
});
