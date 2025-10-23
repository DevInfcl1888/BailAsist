import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(
      `${process.env.MONGO_DB_URL}/${process.env.DB_NAME}` as string
    );
    // res.end("Server started")
  } catch (err) {
    console.log(`Err: ${err}`);
    process.exit(1);
  }
};

export default connectDB;
