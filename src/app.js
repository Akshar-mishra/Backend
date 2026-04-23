import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app=express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit:'16kb'})) //allow our server to accept json data from frontend
app.use(express.urlencoded({extended:true , limit:'16kb'})) //html form submisson data ko accept karne ke liye
app.use(express.static('public'))

app.use(cookieParser())  //string ko obj bna deta hai 

//router code
import userRouter from './routes/user.router.js';
app.use("/api/v1/users", userRouter)

app.use((err, req, res, next) => {
    console.error("🔥 ERROR:", err); // now you'll SEE the error

    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
});
export default app