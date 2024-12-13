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
  secure: process.env.NODE_ENV === "production",
};

export const DefaultProfileUrl =
  "https://res.cloudinary.com/krishan-07/image/upload/v1729935323/default_pfp_gzrmwh.png";

export const ChatEventEnum = Object.freeze({
  CONNECTED_EVENT: "connected",
  DISCONNECT_EVENT: "disconnect",
  JOIN_CHAT_EVENT: "joinChat",
  LEAVE_CHAT_EVENT: "leaveChat",
  UPDATE_GROUP_EVENT: "updateGroup",
  MESSAGE_RECEIVED_EVENT: "messageReceived",
  NEW_CHAT_EVENT: "newChat",
  SOCKET_ERROR_EVENT: "socketError",
  STOP_TYPING_EVENT: "stopTyping",
  TYPING_EVENT: "typing",
  MESSAGE_DELETE_EVENT: "messageDeleted",
  PARTICIPANT_LEFT: "participantLeft",
  PARTICIPANT_JOINED: "participantJoined",
});

export const AvailableChatEvents = Object.values(ChatEventEnum);
