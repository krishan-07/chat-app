import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/ayncHandler.js";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";
import {
  extractPublicIdFromUrl,
  removeFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { emitSocketEvent } from "../socket/index.js";
import { ChatEventEnum } from "../constants.js";

const commonAggregationPipeline = () => {
  return [
    {
      $lookup: {
        from: "users",
        localField: "sender",
        foreignField: "id",
        as: "sender",
        pipeline: [
          {
            $project: {
              username: 1,
              fullname: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$sender",
    },
  ];
};

const getAllMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  if (!chatId) throw new ApiError(400, "Please provide chatId");

  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, "Chat does not exists");

  if (!chat.participants?.includes(req.user?._id))
    throw new ApiError(
      401,
      "Cannot access the chats in which you didn't participated"
    );

  const message = await Message.aggregate([
    {
      $match: {
        chat: new mongoose.Types.ObjectId(chatId),
      },
    },
    ...commonAggregationPipeline(),
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, message, "Messages fetched successfully"));
});

const sendMessage = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { content } = req.body;

  if (!content || !req.files?.attachments?.length)
    throw new ApiError(400, "Atleast content or a file is required");

  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, "Chat does not exists");
  if (chat.participants.includes(req.user?._id))
    throw new ApiError(
      401,
      "cannot access the chat in which you didn't participated"
    );

  const attachments = [];

  if (req.files && req.files?.attachments.length > 0) {
    req.files.attachments.map((attachment) => {
      const file = uploadOnCloudinary(attachment);
      if (!file.url)
        throw new ApiError(400, "Error while uploading on cloudinary");
      attachments.push({
        url: file.secure_url,
        type: file.resource_type,
      });
    });
  }

  const message = await Message.create({
    sender: req.user?._id,
    chat: new mongoose.Types.ObjectId(chatId),
    content: content || "",
    attachments,
  });

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $set: {
        lastMessage: message.content,
      },
    },
    { new: true }
  );
  if (!updatedChat) throw new ApiError(500, "Error while last message in chat");

  const structuredMessage = await Message.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(message._id),
      },
    },
    ...commonAggregationPipeline,
  ]);

  const recievedMessage = structuredMessage[0];
  if (!recievedMessage) throw new ApiError(500, "Internal server error");

  chat.participants.forEach((participant) => {
    if (participant.toString() === req.user?._id.toString()) return;

    emitSocketEvent(
      req,
      participant.toString(),
      ChatEventEnum.MESSAGE_RECEIVED_EVENT,
      recievedMessage
    );
  });

  return res
    .status(201)
    .json(new ApiResponse(201, recievedMessage, "Message sent successfully"));
});

const deleteMessage = asyncHandler(async (req, res) => {
  const { chatId, messageId } = req.params;

  const chat = await Chat.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    participants: req.user?._id,
  });
  if (!chat) throw new ApiError(404, "Chat does not exists");

  const message = await Message.findOne({
    _id: new mongoose.Types.ObjectId(messageId),
  });
  if (!message) throw new ApiError(404, "Message does not exists");

  if (message.sender.toString() !== req.user?._id.toString())
    throw new ApiError(
      401,
      "You don't have access to delete this message, you are not the sender"
    );

  if (message.attachments.length > 0) {
    message.attachments.forEach((attachment) => {
      const response = removeFromCloudinary(
        extractPublicIdFromUrl(attachment.url),
        attachment.type
      );
      if (response !== "ok")
        throw new ApiError(500, "Error while removing from cloudinary");
    });
  }

  const deletedMessage = await Message.findByIdAndUpdate(
    messageId,
    {
      $set: {
        content: "This message was deleted",
        attachments: [],
      },
    },
    {
      new: true,
    }
  );
  if (!deletedMessage) throw new ApiError(500, "Internal server error");

  if (chat.lastMessage.toString() === deletedMessage._id.toString()) {
    const chat = await Chat.findByIdAndUpdate(
      chatId,
      {
        $set: {
          lastMessage: deletedMessage.content,
        },
      },
      { new: true }
    );
    if (!chat) throw new ApiError(500, "Internal server Error");
  }

  chat.participants.forEach((participant) => {
    emitSocketEvent(
      req,
      participant.toString(),
      ChatEventEnum.MESSAGE_DELETE_EVENT,
      deletedMessage
    );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, deletedMessage, "Message deleted successfully"));
});

export { getAllMessages, sendMessage, deleteMessage };
