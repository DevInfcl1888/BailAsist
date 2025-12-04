import cron from "node-cron";
import { ScheduledTask } from "node-cron";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Request, Response } from "express";
import { Reminder } from "../models/bondsman.model";

let dailyJobs: ScheduledTask = null;

const sendReminderToUser = asyncHandler(async (req: Request, res: Response) => {
  const {
    interval,
    roomNumber,
    reminderDate,
    reminderTime,
    reminderNote,
    status,
  } = req.body as {
    interval: string;
    roomNumber?: string;
    reminderDate: string;
    reminderTime: string;
    reminderNote?: string;
    status: string;
  }; // every day
  if (!interval)
    return res
      .status(400)
      .json({ message: "select interval first for send reminder" });

  // previous job stops
  if (dailyJobs) dailyJobs.stop();

  if (!reminderDate || !reminderTime)
    return res
      .status(400)
      .json({ message: "Reminder date and time are required" });
  const dueReminder = await Reminder.findOne({
    reminderDate: reminderDate,
    reminderTime: reminderTime,
    status: "complete",
  });

  if (!dueReminder)
    return res.status(404).json({ message: "Reminder not found" });

  dailyJobs = cron.schedule(`* * * */${interval} * *`, async () => {
    // every 5th day of month
  });
});
