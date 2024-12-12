import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  if (!localFilePath) return null;
  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    console.log("Error while uploading on cloudinary", error);
    return null;
  }
};

const removeFromCloudinary = async (publicId, resourseType = "image") => {
  if (!publicId) return null;
  try {
    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourseType,
    });
    return response.result;
  } catch (error) {
    console.log("Error while removing from cloudinary", error);
    return null;
  }
};

const extractPublicIdFromUrl = (url, type) => {
  if (type === "raw") return url.split("/").pop();

  return url.split("/").pop().split(".")[0];
};

export { uploadOnCloudinary, removeFromCloudinary, extractPublicIdFromUrl };
