import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/ayncHandler.js";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";

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
