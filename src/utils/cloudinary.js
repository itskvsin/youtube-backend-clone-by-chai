import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

(async function () {
  // Configuration
  cloudinary.config({
    cloud_name: process.env.COUDINARY_CLOUD_NAME,
    api_key: process.env.COUDINARY_API_KEY,
    api_secret: process.env.COUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
  });
})();

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null

        //upload the file on cloudinary
        const response  = await cloudinary.uploader.upload(localFilePath , {
            resource_type: "auto"
        })

        //file has been uploaded succesfully
        console.log("uploaded the file on cloudinary" , response.url);
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporaray file as the upload operation fails
        return null;
    }
};

console.log(uploadResult);
