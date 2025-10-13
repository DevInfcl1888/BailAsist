import express from "express";
// import type { Request, Response } from "express";
import cors from "cors"
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json())
app.use(cors())

// app.get('/', (req: Request, res: Response) => {
//   res.send('🚀 TypeScript Backend is running!');
// });


app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
