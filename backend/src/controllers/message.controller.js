import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/ayncHandler.js";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { emitSocketEvent } from "../socket/index.js";
import { ChatEventEnum } from "../constants.js";

const commonAggregationPipeline = () => {
  return [
    {
      $lookup: {
        from: "users",
        localFeild: "sender",
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

  if (!message.length) throw new ApiError(404, "No messages found");

  return res
    .status(200)
    .json(new ApiResponse(200, message[0], "Messages fetched successfully"));
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
      attachments.push(file.url);
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

export { getAllMessages, sendMessage };
