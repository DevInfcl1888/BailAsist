import cron from "node-cron";
import { messaging } from "../config/firebase.js";
import { sendSMS } from "../utils/twilio.js";
import { User } from "../models/user.model.js"; // ✅ using your existing model

cron.schedule("* * * * *", async () => {
  console.log("🕐 Running token validation job...");

  try {
    const users = await User.find({ deviceToken: { $exists: true, $ne: "" } });

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

          // Optionally clear the invalid token
          user.deviceToken = "";
          await user.save();
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
