import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { httpServer } from "./app.js";

dotenv.config({
  path: "./.env",
});

connectDB()
  .then(() => {
    httpServer.on("error", (err) => console.log("server connection failed"));

    httpServer.listen(process.env.PORT || 8080, () => {
      console.log(`server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => console.log("MONGODB connection failed !", err));
