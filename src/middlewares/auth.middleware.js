import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";


export const verifyJWT = asyncHandler(async (req, res, next) => 
{
    try {
        const token = req.cookies?.accessToken ||
                    req.header("Authorization")?.replace("Bearer ", "")
        //nhi hai to 
        if (!token) {
            throw new ApiError(401, "Unauthorized req")
        }
    
        //hai to 
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        if(!user){
            throw new ApiErrors(401,"Invalid Access Token")
        }
    
        // THIS ALL checked that this is the user then do 
        req.user=user
        next()
    } 
    catch (error) {
        throw new ApiErrors(401,err?.message || "Invalid Access Token")
    }

})