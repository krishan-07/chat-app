import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
  path: "./.env",
});

connectDB()
  .then(() => {
    app.on("error", (err) => console.log("server connection failed"));

    app.listen(process.env.PORT || 8080, () => {
      console.log(`server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => console.log("MONGODB connection failed !", err));
