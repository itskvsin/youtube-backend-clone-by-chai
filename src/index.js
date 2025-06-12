// require("dotenv").config({path : "./env"});

import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDb from "./db/index.js";

dotenv.config({
  path: "./env",
});

connectDb()
  .then(() => {
    app.listen(process.env.PORT || 3000);
    app.on("error", (err) => {
      console.log("ERR: ", error);
      throw error;
    });
  })
  .catch((err) => {
    console.log("Mongo Error", err);
  });

/*
import express from "express";
const app = express();

(async () => {
  try {
    await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`);
    app.on("error" , (error) => {
        console.log("ERR: " , error)
        throw error;
    })

    app.listen(process.env.PORT)
  } catch (err) {
    console.log(err);
    throw err;
  }
})();
*/
