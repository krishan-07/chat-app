import jwt from "jsonwebtoken";
import cookie from "cookie";
import { ChatEventEnum } from "../constants.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";

const mountJoinChatEvent = (socket) => {
  socket.on(ChatEventEnum.JOIN_CHAT_EVENT, (chatId) => {
    console.log("User joined the chat. ChatId: " + chatId);
    socket.join(chatId);
  });
};

const mountParticipantTypingEvent = (socket) => {
  socket.on(ChatEventEnum.TYPING_EVENT, (chatId) => {
    socket.in(chatId).emit(ChatEventEnum.TYPING_EVENT, chatId);
  });
};

const mountParticipantStoppedTypingEvent = (socket) => {
  socket.on(ChatEventEnum.STOP_TYPING_EVENT, (chatId) => {
    socket.in(chatId).emit(ChatEventEnum.STOP_TYPING_EVENT, chatId);
  });
};

const getUserData = async (socket) => {
  try {
    const cookies = cookie.parse(socket.handshake.headers?.cookie || "");
    let token = cookies?.accessToken;

    if (!token) token = socket.handshake.auth?.token;
    if (!token)
      throw new ApiError(401, "Unauthorized hanshake. Token is missing");

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );
    if (!user)
      throw new ApiError(401, "Unauthorized hanshake. Token is invalid");

    return user;
  } catch (error) {
    socket.emit(
      ChatEventEnum.SOCKET_ERROR_EVENT,
      error?.message || "Something went wrong while connecting to the socket."
    );
  }
};

const initializeSocketId = (io) => {
  return io.on("connection", async (socket) => {
    try {
      const user = await getUserData(socket);
      socket.user = user;

      socket.join(user._id.toString());
      socket.emit(ChatEventEnum.CONNECTED_EVENT);
      console.log("User connected. UserID: " + user._id.toString());

      mountJoinChatEvent(socket);
      mountParticipantTypingEvent(socket);
      mountParticipantStoppedTypingEvent(socket);

      socket.on(ChatEventEnum.DISCONNECT_EVENT, () => {
        console.log("user has disconnected. userId: " + socket.user?._id);
        if (socket.user?._id) {
          socket.leave(socket.user._id);
        }
      });
    } catch (error) {
      socket.emit(
        ChatEventEnum.SOCKET_ERROR_EVENT,
        error?.message || "Something went wrong while connecting to the socket."
      );
    }
  });
};

const emitSocketEvent = (req, roomId, event, payload) => {
  req.app.get("io").in(roomId).emit(event, payload);
};

export { initializeSocketId, emitSocketEvent };
