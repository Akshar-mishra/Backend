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
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password: {
            type: String,
            required: [true, "password is req"]
        },
        refreshToken: {
            type: String
        }
    },
    { timestamps: true }
)

//dont use ()=>{} bcs it dont allow (this.) and we need this in pre
//async lga hai to no need of next() 
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return ;

    this.password = await bcrypt.hash(this.password, 10);
})


//check password
userSchema.methods.isPasswordCorrect = async function (pass) {
    return await bcrypt.compare(pass, this.password)
}


//jwt sign(payload,secret key , options)
userSchema.methods.generateAccessToken = function () {
        return jwt.sign(
            {
                _id : this._id,  
                username : this.username,
                fullName : this.fullName,
                email : this.email
            },
            process.env.ACCESS_TOKEN_SECRET,
            {expiresIn:process.env.ACCESS_TOKEN_EXPIRY}
        )
}


userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
            {_id:this._id},
            process.env.REFRESH_TOKEN_SECRET,
            {expiresIn:process.env.REFRESH_TOKEN_EXPIRY}
        )
}
export const User = mongoose.model("User", userSchema)