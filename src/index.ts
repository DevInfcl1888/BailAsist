import app from "./app";
import connectDB from "./db/db";

const startServer = async () => {
  await connectDB()
    .then(() => {
      app.listen(process.env.PORT, () => {
        console.log(`Server running on port ${process.env.PORT}`);
      });
    })
    .catch((err) => {
      console.log("Error:", err);
      process.exit(1);
    });
};

startServer();
