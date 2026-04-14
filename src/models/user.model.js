import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt'

const userSchema = new Schema(
    {
        username: {
            type: String,
            lowercase: true,
            required: true,
            trim: true,
            unique: true,
            index: true
        },
        email: {
            type: String,
            lowercase: true,
            required: true,
            trim: true,
            unique: true
        },
        fullName: {
            type: String,
            lowercase: true,
            required: true,
            index: true
        },
        avatar: {
            type: String, //cloudnary url
            required: true
        },
        coverImage: {
            type: String,
            required: true
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password: {
            types: String,
            required: [true, "password is req"]
        },
        refreshToken: {
            type: String
        }
    },
    { timestamps: true }
)

//dont use ()=>{} bcs it dont allow (this.) and we need trhis in pre
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next()
})

//check password
userSchema.methods.isPasswordCorrect = async function (pass) {
    return await bcrypt.compare(pass, this.password)
}

//jwt sign(payload,secret key , options)
userSchema.methods.generateAccessToken = function () {
        jwt.sign(
            {
                _id:this.id,
                username:this.username,
                fullName:this.fullName,
                email:this.email
            },
            process.env.ACCESS_TOKEN_SECRET,
            {expiresIn:process.env.ACCESS_TOKEN_EXPIRY}
        )
}

userSchema.methods.generateRefreshToken = function () {
    jwt.sign(
            {
                _id:this.id
            },
            process.env.REFRESH_TOKEN_SECRET,
            {expiresIn:process.env.REFRESH_TOKEN_EXPIRY}
        )
}
export const User = mongoose.model("User", userSchema)