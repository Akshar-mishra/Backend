import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiErrors } from '../utils/ApiErrors.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js';


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        //inside schema wala refreshToken
        user.refreshToken = refreshToken;

        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (err) {
        //throw new ApiErrors(401, "Something went wrong while generating tokens");
        console.error("TOKEN ERROR:", err);
        throw err;
    }
};


const registerUser = asyncHandler(async (req, res) => {
    //get user detail from frontend
    //validation->not empty
    //check if already registered : email, username
    //check for images , check for avatar
    //uplaod them to cloudinary ,avatar check
    //create user object- create entry in db
    //remove ppass & refreh token field from response
    //check for user creation 
    //return res

    const { fullName, username, email, password } = req.body
    //console.log("email :",email);

    /* 
    if(fullName ===""){
        throw new ApiErrors(400,"fullname is required...")
    }
        */


    //Below line check all fields at once smartly
    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiErrors(400, "All fields are required")
    }


    //check if user already exist with email or username frm db
    const existedUser = await User.findOne({ $or: [{ username }, { email }] })
    if (existedUser) {
        throw new ApiErrors(402, "User already exist or email already exists")
    }


    //checking avatar n images
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;
    console.log(req.files);
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiErrors(400, "avatar file is required")
    }

    //upload on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!avatar) {
        throw new ApiErrors(400, "avatar file is required")
    }

    //create user in DB
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    });
    //hiding password and refresh token from api response 
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"  //ye fields nhi aayengi 
    )
    if (!createdUser) {
        throw new ApiErrors(500, "somthing went wrong while registring user")
    }


    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registeres successfully")
    )
})


const loginUser = asyncHandler(async (req, res) => {
    //req body se data
    //user name and email check
    //find the user
    //password cheeck
    //access & refresh token generation
    //send secure cookies of them 
    //success

    const { email, username, password } = req.body
    if (!(username || email)) {
        throw new ApiErrors(400, "Username and email is req")
    }


    const user = await User.findOne({ $or: [{ username }, { email }] })
    if (!user) {
        throw new ApiErrors(404, "User doesnt exist")
    }


    //User is whole database so we cant use it here so we use instance here as (user) 
    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiErrors(404, "Password Incorrect")
    }

    //IMP common practice for ACT & RFT so we make seprate method
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    //user ko ye nhi bhejna hai
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    //cookies bhejna
    const options = {
        httpOnly: true,
        secure: false
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User loggedin successfully"
            )
        )
})


const logoutUser = asyncHandler(async (req, res) => {
    //1st made the middleware to verify the user with jwt token and then we can use that user here in logout

    //clear the refresh token from db
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    //ccookies delete kro
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"))

})


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiErrors(401, "Unauthorized Request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process, env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiErrors(401, "Invalid Refresh Token")
        }

        if (!incomingRefreshToken !== user?.refreshToken) {   //the reftoken is from generate acc n re toekn
            throw new ApiErrors(401, "Refresh token is used or expired"
            )
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id)
        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken },
                    "Access Token Refreshed"
                )
            )
    }
    catch (error) {
        throw new ApiErrors(401, error?.message || "Invalid Ref Token")
    }
})


const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    //comes feom auth.middleware
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiErrors(400, "Invalid Old Password")
    }

    user.password = newPassword  //jaise hi ye trigger ho go to model  here pass set
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, "Password Changed Success"))
})


const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(200, req.user, "current user fetched sunnessfully")
})


const updateAccountDetails = asyncHandler(async (req,res) => {
    const { fullName, email } = req.body
    if (!fullName || !email) {
    }
    throw new ApiError(400, "All fields are required")

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:
            {
                fullName,
                email: email  //both same
            }
        },
        { new: true }
    ).select("-password")

    return res
    .status(200)
    .json(200, req.user, "current user fetched sunnessfully")
})

const updateUserAvatar= asyncHandler(async(req,res)=>{
    const avatarLocalPath= req.file?.path  //not files bcs onnly avatar hai
    if(!avatarLocalPath){
        throw new ApiErrors(400,"Avatar file is missing")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiErrors(400,"err on Uplaoing in cloudinary")
    }

    //updating now
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new :true}
    ).select("-password")

    return res.status(200).json(
        new ApiResponse(200,user,"cover Image updated")
    )
})

const updateUserCoverImage= asyncHandler(async(req,res)=>{
    const coverImageLocalPath= req.file?.path  //not files bcs onnly avatar hai
    if(!coverImageLocalPath){
        throw new ApiErrors(400,"cover image file is missing")
    }

    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiErrors(400,"err on Uplaoing in cloudinary")
    }

    //updating now
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new :true}
    ).select("-password")

    return res.status(200).json(
        new ApiResponse(200,user,"cover Image updated")
    )
})


const getUserChannelProfile= asyncHandler(async()=>{
    const {username} = req.params
    if(!username?.trim()){
        throw new ApiErrors(400,"username missing")
    }

    //aggrigation pipeline => array values
    const channel = await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {   //wtever to show
            $project:{
                fullName:1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed:1,
                avatar: 1,
                coverImage:1,
                email: 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiErrors(404,"channel doesnt exists")
    }

    return res.status(200)
    .json(
        new ApiResponse(200,channel[0],"user channel fetched successfully")
    )
})

const getWatchHistory= asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory" ,
                pipeline:[
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner" ,
                            pipeline:[
                                {
                                    $project:{
                                        username:1,
                                        fullname:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {   //this isnt necessary on ly for frontend man goodwill
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res 
    .status(200)
    .json(
        new ApiResponse(200,user[0].watchHistory,"Watch History fetched successfully")
    )
})

export {
        registerUser, loginUser, logoutUser, refreshAccessToken,
        changeCurrentPassword, getCurrentUser,updateAccountDetails,updateUserAvatar
         , updateUserCoverImage , getUserChannelProfile ,getWatchHistory
    }