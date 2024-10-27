import { asyncHandler } from "../utils/ayncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { cookieOptions } from "../constants.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access tokens"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { email, password, username, fullname } = req.body;
  const avatarLocalPath = req.file?.path;

  if (
    [email, password, username, fullname].some(
      (data) => data?.trim() === "" || !data
    )
  )
    throw new ApiError(400, "Please fill all the required fields");

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

  const { refreshToken, accessToken } = generateAccessAndRefreshToken(
    isUserExists._id
  );

  const user = await User.findById(isUserExists._id).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
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

export { registerUser, loginUser };
