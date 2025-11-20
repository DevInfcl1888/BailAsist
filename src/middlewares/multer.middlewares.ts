import multer from "multer";
import { isValidImg } from "../utils/dataValidators.js";

const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (req, file, cb) => {
    console.log("API_REQ", req);
    
    isValidImg(file.mimetype)
      ? cb(null, true)
      : cb(Error("Only images allowed - jpeg, jpg, webp, png (5 MB)"));
  },
});

