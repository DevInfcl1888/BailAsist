import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload img function on cloudinary
export const uploadToCloudinary = async (
  buffer: Buffer,
  folder?: string
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "BailAssist_Assests",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    // send buffer data to stream
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};
