import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/ayncHandler.js";
import { User } from "../models/user.model.js";
import { Chat } from "../models/chat.model.js";
import { emitSocketEvent } from "../socket";
import { ChatEventEnum } from "../constants";
import { Message } from "../models/message.model.js";
import {
  extractPublicIdFromUrl,
  removeFromCloudinary,
} from "../utils/cloudinary.js";

const commonAggregationPipeline = () => {
  return [
    {
      // lookup for the participants present
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "participants",
        as: "participants",
        pipeline: [
          {
            $project: {
              password: 0,
              refreshToken: 0,
            },
          },
        ],
      },
    },
    {
      // lookup for the group chats
      $lookup: {
        from: "chatmessages",
        foreignField: "_id",
        localField: "lastMessage",
        as: "lastMessage",
        pipeline: [
          {
            // get details of the sender
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "sender",
              as: "sender",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    avatar: 1,
                    email: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              sender: { $first: "$sender" },
            },
          },
        ],
      },
    },
    {
      $addFields: {
        lastMessage: { $first: "$lastMessage" },
      },
    },
  ];
};

const deleteCascadeChatMessages = async (chatId) => {
  const messages = await Message.find({
    chat: new mongoose.Types.ObjectId(chatId),
  });
  if (!messages.length) throw new ApiError(404, "No messages found");

  const response = await Message.deleteMany({
    chat: new mongoose.Types.ObjectId(chatId),
  });
  if (response.deletedCount !== messages.length - 1) {
    throw new ApiError(500, "Error while removing the data");
  }

  let attachments = [];

  attachments.concat(...messages.map((message) => message.attachments));

  attachments.forEach(async (attachment) => {
    const response = await removeFromCloudinary(
      extractPublicIdFromUrl(attachment.url),
      attachment.type
    );
    if (response !== "ok")
      throw new ApiError(
        500,
        "Internal server error while removing attachments"
      );
  });
};

const createOrGetSingleChat = asyncHandler(async (req, res) => {
  const { receiverId } = req.params;

  const user = await User.findById(receiverId);
  if (!user) throw new ApiError(404, "Receiver does not exists");
  if (user._id === req.user?._id)
    throw new ApiError(400, "Cannot chat with yourself ");

  const chat = await Chat.aggregate([
    {
      $match: {
        isGroupChat: false,
        $and: [
          {
            participants: { $eleMatch: { $eq: req.user?._id } },
          },
          {
            participants: {
              $eleMatch: { $eq: new mongoose.Types.ObjectId(receiverId) },
            },
          },
        ],
      },
    },
    ...commonAggregationPipeline,
  ]);

  if (chat.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, chat[0], "Chat fetched successfully"));
  }

  const newChatInstance = await Chat.create({
    name: new mongoose.Types.ObjectId(receiverId),
    participants: [req.user?._id, new mongoose.Types.ObjectId(receiverId)],
    admin: req.user?._id,
  });

  const createdChat = await Chat.aggregate([
    {
      $match: {
        _id: newChatInstance._id,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "name",
        foreignField: "_id",
        as: "name",
        pipeline: [
          {
            $project: {
              fullName: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$name",
    },
    ...commonAggregationPipeline,
  ]);

  const payload = createdChat[0];
  if (!payload) throw new ApiError(500, "Internal server error");

  payload.participants.forEach((participant) => {
    if (participant.toString() === req.user?._id.toString()) return;
    emitSocketEvent(
      req,
      participant._id.toString(),
      ChatEventEnum.NEW_CHAT_EVENT,
      payload
    );
  });

  return res
    .status(201)
    .json(new ApiResponse(201, payload, "Chat created successfully"));
});

const deleteSingleChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const chat = await Chat.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(chatId),
      },
    },
  ]);

  const payload = chat[0];
  if (!payload) throw new ApiError(404, "Chat doesn't exists");

  await Chat.findByIdAndDelete(payload._id);
  await deleteCascadeChatMessages(chatId);

  payload.participants.forEach((participant) => {
    if (participant.toString() === req.user?._id) return;
    emitSocketEvent(
      req,
      participant.toString(),
      ChatEventEnum.LEAVE_CHAT_EVENT,
      payload
    );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Chat deleted successfully"));
});

export { createOrGetSingleChat, deleteSingleChat };
