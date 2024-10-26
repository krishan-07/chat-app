import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  AvailableSocialLogins,
  AvailableUserRoles,
  UserLoginType,
  UserRolesEnum,
} from "../constants";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowerCase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowerCase: true,
      trim: true,
      index: true,
    },
    fullname: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    avatar: {
      type: String,
      default:
        "https://res.cloudinary.com/krishan-07/image/upload/v1729935323/default_pfp_gzrmwh.png",
    },
    refreshToken: {
      type: String,
    },
    role: {
      type: AvailableUserRoles,
      default: UserRolesEnum.USER,
    },
    loginType: {
      type: AvailableSocialLogins,
      default: UserLoginType.EMAIL_PASSWORD,
    },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullname: this.fullname,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.generateRefreshToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
