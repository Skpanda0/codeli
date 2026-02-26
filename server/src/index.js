import express from "express"
import dotenv from "dotenv"

dotenv.config()

const app = express();

app.get("/health", (req,res) => {
    res.send("hello")
})

app.listen(process.env.PORT, ()=>{
    console.log(`Server is running ${process.env.PORT}`)
})