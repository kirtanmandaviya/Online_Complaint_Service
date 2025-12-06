import { app } from "./app.js"
import connectDB from "../src/db/index.js";
import dotenv from "dotenv"

dotenv.config({
    path:"./.env"
})

const PORT = process.env.PORT  || 7003

connectDB()
.then(() => {
    app.listen(PORT, () => {
    console.log(`Port is listening on ${PORT}`);
})})
.catch((error) => {
    console.log("MongoDB connection Error" , error)
})