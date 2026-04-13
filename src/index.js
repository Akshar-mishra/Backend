import dotenv from "dotenv";
import connectDB from "./db/index.js"; // include .js extension in ESM

dotenv.config({
  path: "./.env"
});

connectDB()
.then(()=>{
  app.listen(process.env.PORT || 8000,()=>{
    console.log(`server is running on ${proces.env.PORT}`);
  })
})
.catch((err)=>{
  console.log("errr h connection me");
})
