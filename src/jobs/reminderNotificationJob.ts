import { ReminderNotification } from "../models/notification.model.js";
import cron from "node-cron";
import { Reminder } from "../models/bondsman.model.js";
import { User } from "../models/user.model.js";
import { messaging } from "../config/firebase.js";
import { format, differenceInDays } from "date-fns"; // Reliable date functions

// Run every minute to check for reminders
cron.schedule("* * * * *", async () => {
  const now = new Date();
  // Current time in "HH:mm" format (e.g., "10:00")
  const currentTimeString = format(now, "HH:mm");

  // Current date at midnight for accurate day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  console.log(`🕐 Running interval reminder job at ${currentTimeString}...`);
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

    let notificationsSent = 0;
    // Process each reminder
    for (const reminder of reminders) {
      try {
        // Check if reminder has a user
        if (reminder.reminderTime !== currentTimeString) {
          console.log(
            `⚠️ Skipping reminder ${reminder._id} - no user associated`
          );
          continue;
        }
        // --- 2. DATE AND INTERVAL CHECK ---

        const reminderDateObj = new Date(reminder.reminderDate);

        const diffDays = differenceInDays(reminderDateObj, today);

        const interval = parseInt(reminder.interval) || 0;

        const shouldSend = diffDays >= 0 && diffDays <= interval;

        if (!shouldSend) {
          continue;
        }

        // --- 3. USER AND TOKEN CHECK (Standard Guards) ---
        if (!reminder.user) continue;

        // Find user in users collection by _id
        const user = await User.findById(reminder.user).select(
          "deviceToken firstName lastName email"
        );

        if (!user || user.email.trim() === "") {
          console.log(
            `⚠️ Skipping reminder ${reminder._id} - user ${reminder.user} not found`
          );
          continue;
        }

        if (!user.deviceToken || user.deviceToken.trim() === "") {
          console.log(
            `⚠️ Skipping reminder ${reminder._id} - user ${reminder.user} has no device token`
          );
          continue;
        }

        // Prepare notification content
        const notificationTitle = "Reminder - BailAsist";
        let notificationBody = "";

        let statusLine = "";
        if (diffDays === 0) {
          statusLine = "🚨 DUE TODAY! ";
        } else if (diffDays > 0) {
          statusLine = `${diffDays} day(s) remaining. `;
        }

        // Use the structure you preferred, but prefix with the urgency status
        if (reminder.reminderDate && reminder.reminderTime) {
          notificationBody = `${statusLine}Scheduled for ${reminder.reminderDate} at ${reminder.reminderTime}`;
        } else if (reminder.reminderDate) {
          notificationBody = `${statusLine}Scheduled for ${reminder.reminderDate}`;
        } else {
          notificationBody = `${statusLine}You have a reminder.`;
        } // Add note if available (Separate line for note)

        if (reminder.reminderNote && reminder.reminderNote.trim() !== "") {
          notificationBody += ` - Note: ${reminder.reminderNote}`;
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
              roomNumber: reminder.roomNumber || "",
              type: "reminder",
            },
          });

          console.log(
            `✅ Push notification sent for reminder ${reminder._id} to user ${user._id}`
          );

          await ReminderNotification.create({
            user: user._id,
            reminderId: reminder._id,
            deviceToken: user.deviceToken ? user.deviceToken : "",
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
              roomNumber: reminder.roomNumber || "",
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
            await User.findByIdAndUpdate(user?._id, {
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
