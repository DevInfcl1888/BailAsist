// import cron from "node-cron";
// import { Reminder } from "../models/bondsman.model.js";

// cron.schedule(`* * * * *`, async () => {
//   // every 5th day of month
//   console.log("Running reminder job");
//   try {
//     const now = new Date();
//     const reminders = await Reminder.find({
//       isActive: true,
//     });

//     for (const r of reminders) {
//       const dueTime = new Date(`${r.reminderDate}T${r.reminderTime}:00`);
//       if (now >= dueTime) {
//         //   sendNotification(r)  <-- send notification
//         const next = new Date(dueTime);
//         next.setDate(next.getDate() + Number(r.interval));

//         r.reminderDate = next.toISOString().split("T")[0];
//         await r.save();
//       }
//     }
//   } catch (error) {
//     console.log("Error occur during sending reminder", error);
//   }
// });
