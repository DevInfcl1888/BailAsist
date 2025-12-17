import cron from "node-cron";
import { CheckIn } from "../models/user.model.js";
import { CheckOut } from "../models/user.model.js";

const TWO_MIN = 2 * 60 * 1000;
const THREE_MIN = 3 * 60 * 1000;

cron.schedule("* * * * *", async () => {
  console.log("🕐 CheckIn / CheckOut state cron running...");

  const now = new Date();

  /* ----------------------------------
     PHASE 1 → PHASE 2 (AUTO CHECKOUT)
  -----------------------------------*/
  const activeCheckIns = await CheckIn.find({ isCheckIn: true });

  for (const checkin of activeCheckIns) {
    const diff = now.getTime() - new Date(checkin.createdAt as any).getTime();

    if (diff >= TWO_MIN) {
      // flip checkin
      await CheckIn.updateOne(
        { _id: checkin._id },
        { $set: { isCheckIn: false } }
      );

      // create checkout if not exists
      const exists = await CheckOut.findOne({
        checkInID: checkin._id,
        user: checkin.user,
      });

      if (!exists) {
        await CheckOut.create({
          user: checkin.user,
          checkInID: checkin._id,
          photoUrl: "",
          location: checkin.location, // ✅ LAST CHECKIN LOCATION
          isCheckOut: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  /* ----------------------------------
     PHASE 2 → PHASE 3 (RESET STATE)
  -----------------------------------*/
  const activeCheckOuts = await CheckOut.find({ isCheckOut: true });

  for (const checkout of activeCheckOuts) {
    const diff = now.getTime() - new Date(checkout.createdAt as any).getTime();

    if (diff >= THREE_MIN) {
      // flip checkout
      await CheckOut.updateOne(
        { _id: checkout._id },
        { $set: { isCheckOut: false } }
      );
    }
  }
});

// ---------- 12 hour ------------

// const isWithinTodayWindow = (date: Date) => {
//   const startOfDay = new Date();
//   startOfDay.setHours(0, 0, 0, 0);

//   const endOfDay = new Date();
//   endOfDay.setHours(23, 59, 59, 999);

//   return date >= startOfDay && date <= endOfDay;
// };

// cron.schedule("* * * * *", async () => {
//   console.log("🕐 CheckIn / CheckOut state cron running...");

//   const now = new Date();

//   /* ----------------------------------
//      PHASE 1 → AUTO CHECKOUT
//      (12:00 AM → 11:59:59 PM)
//   -----------------------------------*/
//   const activeCheckIns = await CheckIn.find({ isCheckIn: true });

//   for (const checkin of activeCheckIns) {
//     const checkInTime = new Date(checkin.createdAt as any);

//     if (isWithinTodayWindow(checkInTime)) {
//       // flip check-in
//       await CheckIn.updateOne(
//         { _id: checkin._id },
//         { $set: { isCheckIn: false } }
//       );

//       // create checkout if not exists
//       const exists = await CheckOut.findOne({
//         checkInID: checkin._id,
//         user: checkin.user,
//       });

//       if (!exists) {
//         await CheckOut.create({
//           user: checkin.user,
//           checkInID: checkin._id,
//           photoUrl: "",
//           location: checkin.location,
//           isCheckOut: true,
//           createdAt: now,
//           updatedAt: now,
//         });
//       }
//     }
//   }

//   /* ----------------------------------
//      PHASE 2 → RESET STATE
//      (12:00 AM → 11:59:59 PM)
//   -----------------------------------*/
//   const activeCheckOuts = await CheckOut.find({ isCheckOut: true });

//   for (const checkout of activeCheckOuts) {
//     const checkOutTime = new Date(checkout.createdAt as any);

//     if (isWithinTodayWindow(checkOutTime)) {
//       // flip checkout
//       await CheckOut.updateOne(
//         { _id: checkout._id },
//         { $set: { isCheckOut: false } }
//       );
//     }
//   }
// });
