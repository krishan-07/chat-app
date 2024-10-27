export const DB_NAME = "chat-app";

export const UserRolesEnum = {
  ADMIN: "ADMIN",
  USER: "USER",
};

export const AvailableUserRoles = Object.values(UserRolesEnum);

export const UserLoginType = {
  GOOGLE: "GOOGLE",
  GITHUB: "GITHUB",
  EMAIL_PASSWORD: "EMAIL_PASSWORD",
};

export const AvailableSocialLogins = Object.values(UserLoginType);

export const CookieOptions = {
  httpOnly: true,
  secure: true,
};

export const DefaultProfileUrl =
  "https://res.cloudinary.com/krishan-07/image/upload/v1729935323/default_pfp_gzrmwh.png";
