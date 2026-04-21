import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiErrors} from '../utils/ApiErrors.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js';

const registerUser= asyncHandler(async(req,res)=>{
    //get user detail from frontend
    //validation-not empty
    //check if already registered : email, username
    //check for images , check for avatar
    //uplaod them to cloudinary ,avatar check
    //create user object- create entry in db
    //remove ppass & refreh token field from response
    //check for user creation 
    //return res

    const {fullName,username,email,password}=req.body
    console.log("email :",email);

    /* 
    if(fullName ===""){
        throw new ApiErrors(400,"fullname is required...")
    }
        */


    //Below line check all fields at once smartly
    if([fullName,email,username,password].some((field)=> field?.trim()==="")){
        throw new ApiErrors(400, "All fields are required")
    }


    //check if user already exist with email or username
    const existedUser=User.findOne({
        $or: [{username},{email}]
    })
    if(existedUser){
        throw new ApiErrors(402,"User already exist or email used")
    }


    //checking avatar n images
    const avatarLoaclPath=req.files?.avatar[0]?.path;
    const coverImageLoaclPath=req.files?.coverImage[0]?.path;
    if(!avatarLoaclPath){
        throw new ApiErrors(400,"avatar file is required")
    }


    const avatar=await uploadOnCloudinary(avatarLoaclPath)
    const coverImage=await uploadOnCloudinary(coverImageLoaclPath)
    if(!avatar){
        throw new ApiErrors(400,"avatar file is required")
    }

    
    const user=await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    });
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"  //ye fields nhi aayengi 
    )
    if(!createdUser){
        throw new ApiErrors(500,"somthing went wrong while registring user")
    }


    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Registeres successfully")
    )
})

export {registerUser}