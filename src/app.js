import express from 'express';
import cors from 'cors'
import cookieParser from 'cookie-parser';

const app=express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credential:true
}))

app.use(express.json({limit:'16kb'})) //allow our server to accept json data from frontend
app.use(express.urlencoded({extended:true , limit:'16kb'}))
app.use(express.static('public'))

app.use(cookieParser())  //string ko obj bna deta hai 

export {app}