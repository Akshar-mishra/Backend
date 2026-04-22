import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiErrors} from '../utils/ApiErrors.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js';


const generateAccessAndRefreshToken= async (userId)=>
{
    try
    {
        const user= await User.findById(userId);
        const accessToken=user.generateAccessToken
        const refreshToken=user.generateRefreshToken;

        user.refreshToken=refreshToken;
        await user.save({ validateBeforeSave:false })
 
        return {accessToken,refreshToken}

    }
    catch(err){
        throw new ApiErrors(401,"Somthing went wrong while generating tokens")
    }
}


const registerUser= asyncHandler(async(req,res)=>{
    //get user detail from frontend
    //validation->not empty
    //check if already registered : email, username
    //check for images , check for avatar
    //uplaod them to cloudinary ,avatar check
    //create user object- create entry in db
    //remove ppass & refreh token field from response
    //check for user creation 
    //return res

    const {fullName,username,email,password}=req.body
    //console.log("email :",email);

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
    const existedUser=await User.findOne({$or: [{username},{email}]})
    if(existedUser){
        throw new ApiErrors(402,"User already exist or email already exists")
    }


    //checking avatar n images
    const avatarLocalPath=req.files?.avatar[0]?.path;
    //const coverImageLocalPath=req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.
    coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].
    path
    }

    if(!avatarLocalPath){
        throw new ApiErrors(400,"avatar file is required")
    }

    //upload on cloudinary
    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    if(!avatar){
        throw new ApiErrors(400,"avatar file is required")
    }

    //create user in DB
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


const loginUser=asyncHandler(async(req,res)=>{
    //req body se data
    //user name and email check
    //find the user
    //password cheeck
    //access & refresh token generation
    //send secure cookies of them 
    //success

    const {email,username,password}=req.body
    if(!(username || email)){
        throw new ApiErrors(400,"Username and email is req")
    }


    const user= await User.findOne({ $or: [{username}, {email}]})
    if(!user){
        throw new ApiErrors(404,"User doesnt exist")
    }
    

    //User is whole database so we cant use it here so we use instance here as (user)
    const isPasswordValid= await user.isPasswordCorrect(password)
    if(!isPasswordValid){
            throw new ApiErrors(404,"uPassword Incorrect")
    }

    //IMP commpon practice for ACT & RFT so we make seprate method
    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)

    //user ko ye nhi bhejna hai
    const loggedInUser= await User.findById(user._id).select("-password -refreshToken")

    //cookies bhejna
    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {user: loggedInUser,accessToken,refreshToken},
            "User loggedin successfully"
        )
    )
})


const logoutUser= asyncHandler(async(req,res)=>{
    //1st made the middleware to verify the user with jwt token and then we can use that user here in logout
    
    //clear the refresh token from db
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:false
            }
        },
        {
            new:true
        }
    )

    //ccookies delete kro
    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out"))
    
})

export {registerUser,loginUser ,logoutUser }