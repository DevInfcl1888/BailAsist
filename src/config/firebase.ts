import admin from "firebase-admin";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.resolve(__dirname, "../../key.json");

// ✅ Ensure file exists
if (!fs.existsSync(serviceAccountPath)) {
    throw new Error("❌ Firebase key.json file not found at project root");
}

// Initialize Firebase Admin using the key.json file
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

export const messaging = admin.messaging();
