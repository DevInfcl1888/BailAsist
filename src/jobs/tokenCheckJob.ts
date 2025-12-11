import cron from "node-cron";
import { messaging } from "../config/firebase.js";
import { sendSMS } from "../utils/twilio.js";
import { User } from "../models/user.model.js"; // ✅ using your existing model

const TOKEN_INVALID_COOLDOWN_MS = 1 * 60 * 60 * 1000; // 1 hours
cron.schedule("*/10 * * * *", async () => {
  console.log("🕐 Running token validation job...");

  try {
    const now = Date.now();
    const cooldownPeriodAgo = new Date(now - TOKEN_INVALID_COOLDOWN_MS);

    const users = await User.find({
      deviceToken: { $exists: true, $ne: "" },
      $or: [
        { lastTokenInvalidSMSAt: { $exists: false } }, // Never sent
        { lastTokenInvalidSMSAt: null },
        { lastTokenInvalidSMSAt: { $lte: cooldownPeriodAgo } }, // Cooldown finished
      ],
    });

    if (users.length === 0) {
      console.log(
        "✅ No users found needing token check or are still in cooldown."
      );
      return;
    }

    console.log(`🔎 Checking tokens for ${users.length} user(s).`);
    for (const user of users) {
      if (!user.deviceToken) continue;

      try {
        // Try sending a dummy silent message to validate token
        await messaging.send({
          token: user.deviceToken,
          notification: {
            title: "Ping",
            body: "Token validation check",
          },
        });

        console.log(`✅ Token valid for user: ${user.phoneNo}`);
      } catch (error: any) {
        const errCode = error?.errorInfo?.code;

        if (errCode === "messaging/registration-token-not-registered") {
          console.log(`🚫 Invalid token detected for ${user.phoneNo}`);

          await sendSMS(
            user.phoneNo,
            "We noticed your app might have been uninstalled. Please reinstall to continue receiving updates.",
            user.email
          );

          await User.findByIdAndUpdate(user._id, {
            $set: {
              deviceToken: "", // Clear the invalid token
              lastTokenInvalidSMSAt: new Date(), // Set the cooldown timestamp
            },
          });

          console.log(
            `✅ SMS sent and token cleared for ${user.phoneNo}. Cooldown set.`
          );
        } else {
          console.error(
            `⚠️ Error validating token for ${user.phoneNo}:`,
            errCode
          );
        }
      }
    }
  } catch (err) {
    console.error("❌ Cron job failed:", err);
  }
});
