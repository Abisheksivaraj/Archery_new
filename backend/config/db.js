const mongoose = require("mongoose");
require("dotenv").config({ path: "./backend/.env" });

let URI = process.env.MONGO_URI;
console.log(URI);
const connectDb = () => {
  return mongoose.connect(URI);
};

module.exports = connectDb;
