const connectDb = require("../backend/config/db");
const app = require("../backend/index");
require("dotenv").config({ path: "./backend/.env" });

const PORT = 5555

app.listen(PORT,async()=>{
  await connectDb();
  console.log("Website is Running on:"+PORT);
  
})