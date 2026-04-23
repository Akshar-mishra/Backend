import { v2 as cloudinary } from "cloudinary";
import { log } from "console";
import fs from 'fs'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

//async aiwat imp
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null

        //upload file on clodinary
        const response = await cloudinary.uploader.upload(localFilePath, { resource_type: "auto" })
        //file uploaded successfully

        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        return response
    }
    catch (error) {
            if (localFilePath && fs.existsSync(localFilePath)) {
                fs.unlinkSync(localFilePath);
            }
            throw error; // IMPORTANT: don't silently fail
        } //it removes the loally save file as the upload operatin failed 
}

export { uploadOnCloudinary }