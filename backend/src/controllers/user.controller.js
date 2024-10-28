import { asyncHandler } from "../utils/ayncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import {
  extractPublicIdFromUrl,
  removeFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import {
  CookieOptions,
  DefaultProfileUrl,
  UserLoginType,
} from "../constants.js";
import jwt from "jsonwebtoken";
import fs from "fs";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access tokens"
    );
  }
};

const removeLocalFile = (filePath) => {
  if (filePath) fs.unlinkSync(filePath);
  return null;
};

const registerUser = asyncHandler(async (req, res) => {
  const { email, password, username, fullname } = req.body;
  const avatarLocalPath = req.file?.path;

  if (
    [email, password, username, fullname].some(
      (data) => data?.trim() === "" || !data
    )
  ) {
    removeLocalFile(avatarLocalPath);
    throw new ApiError(400, "Please fill all the required fields");
  }
  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser)
    throw new ApiError(400, "User with same username or email already exists");

  let avatar;
  if (avatarLocalPath) {
    avatar = await uploadOnCloudinary(avatarLocalPath);
  }

  const user = await User.create({
    email,
    fullname,
    username,
    password,
    avatar: avatar?.url,
  });

  if (!user) throw new ApiError(500, "Error while registering the user");

  return res
    .status(201)
    .json(new ApiResponse(201, user, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { field, password } = req.body;
  if (!field || field.trim() === "")
    throw new ApiError(400, "Please provide email or username");
  if (!password || password.trim() === "")
    throw new ApiError(400, "Please provide password");

  const isUserExists = await User.findOne({
    $or: [
      {
        username: field,
      },
      {
        email: field,
      },
    ],
  });

  if (!isUserExists) throw new ApiError(404, "User not found");

  if (user.loginType !== UserLoginType.EMAIL_PASSWORD) {
    // If user is registered with some other method, we will ask him/her to use the same method as registered.
    // This shows that if user is registered with methods other than email password, he/she will not be able to login with password. Which makes password field redundant for the SSO
    throw new ApiError(
      400,
      "You have previously registered using " +
        user.loginType?.toLowerCase() +
        ". Please use the " +
        user.loginType?.toLowerCase() +
        " login option to access your account."
    );
  }

  const { refreshToken, accessToken } = await generateAccessAndRefreshToken(
    isUserExists._id
  );

  const user = await User.findById(isUserExists._id).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, CookieOptions)
    .cookie("refreshToken", refreshToken, CookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );
  if (!user || user?.length === 0) throw new ApiError(404, "User not found");

  return res
    .status(200)
    .clearCookie("refreshToken", CookieOptions)
    .clearCookie("accessToken", CookieOptions)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request");

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESh_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken._id);

    if (!user || user?.length === 0)
      throw new ApiError(401, "Invalid refresh token");
    if (user.refreshToken !== incomingRefreshToken)
      throw new ApiError(401, "Refreshtoken expired");

    const { refreshToken, accessToken } = await generateAccessAndRefreshToken(
      user._id
    );

    return res
      .status(200)
      .cookie("refreshToken", refreshToken, CookieOptions)
      .cookie("accessToken", accessToken, CookieOptions)
      .json(
        new ApiResponse(
          200,
          { refreshToken, accessToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(500, error?.message || "Something went wrong");
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { currPassword, newPassword } = req.body;

  if (!currPassword || currPassword.trim() === "")
    throw new ApiError(400, "Please provide current password");
  if (!newPassword || newPassword.trim() === "")
    throw new ApiError(400, "please provide new password");

  const user = await User.findById(req.user?._id);
  const isPassword = await user.isPasswordCorrect(currPassword);

  if (!isPassword) throw new APiError(400, "Invalid current password");

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;
  if ([fullname, email].some((data) => data?.trim() === "" || !data))
    throw new ApiError(400, "Please provide the necessary fields");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    {
      new: true,
    }
  ).select("-password");
  if (!user || user.length === 0) throw new ApiError(400, "User not found");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User details updated successfully"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  const oldAvatar = await User.findById(req.user?._id).select("avatar");

  if (!avatarLocalPath) throw new ApiError(400, "Please provide valid photo");
  if (!oldAvatar) {
    removeLocalFile(avatarLocalPath);
    throw new ApiError(404, "User not found");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar?.url)
    throw new ApiError(
      500,
      "Something went wrong while uploading on cloudinary"
    );
  else {
    if (oldAvatar.avatar !== DefaultProfileUrl) {
      const response = await removeFromCloudinary(
        extractPublicIdFromUrl(oldAvatar.avatar)
      );

      if (response.result !== "ok")
        throw new ApiError(400, "Error while removing the old file");
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, user, "User profile avatar updated successfully")
    );
});

const removeAvatar = asyncHandler(async (req, res) => {
  const oldAvatar = await User.findById(req.user?._id).select("avatar");
  if (!oldAvatar) throw new ApiError(500, "Error while finding the user");

  if (oldAvatar.avatar === DefaultProfileUrl)
    throw new ApiError(400, "Cannot remove default avatar");

  const response = await removeFromCloudinary(
    extractPublicIdFromUrl(oldAvatar.avatar)
  );
  if (response.result !== "ok")
    throw new ApiError(400, "Error while removing from cloudinary");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: DefaultProfileUrl,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar removed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User fetched successfully"));
});

const getUser = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId || userId.trim() === "")
    throw new ApiError(400, "Provide user id");

  const user = await User.findById(userId).select("-password -refreshToken");
  if (!user) throw new ApiError(500, "Something went wrong while finding user");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User fetched successfully"));
});

const handleSocialLogin = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  return res
    .status(301)
    .cookie("accessToken", accessToken, CookieOptions)
    .cookie("refreshToken", refreshToken, CookieOptions)
    .redirect(
      // redirect user to the frontend with access and refresh token in case user is not using cookies
      `${process.env.CLIENT_SSO_REDIRECT_URL}?accessToken=${accessToken}&refreshToken=${refreshToken}`
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  updateUserDetails,
  updateAvatar,
  removeAvatar,
  getCurrentUser,
  getUser,
  handleSocialLogin,
};
