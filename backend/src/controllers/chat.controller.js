import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/ayncHandler.js";
import { User } from "../models/user.model.js";
import { Chat } from "../models/chat.model.js";
import { emitSocketEvent } from "../socket/index.js";
import { ChatEventEnum } from "../constants.js";
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
    ...commonAggregationPipeline(),
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
    if (participant._id.toString() === req.user?._id.toString()) return;
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

  const chat = await Chat.findById(chatId);

  if (!chat) throw new ApiError(404, "Chat doesn't exists");

  await Chat.findByIdAndDelete(chatId);
  await deleteCascadeChatMessages(chatId);

  chat.participants.forEach((participant) => {
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

const createGroupChat = asyncHandler(async (req, res) => {
  const { name, participants } = req.body;
  if (participants.includes(req.user?._id))
    throw new ApiError(
      400,
      "Participants array should not contain the group creator"
    );

  const members = [new Set([...participants, req.user?._id])];

  if (members.length < 3)
    throw new ApiError(400, "A group should contain more than 3 members");

  const groupChat = await Chat.create({
    name: name || "Group chat",
    isGroupChat: true,
    participants: members,
    admin: req.user?._id,
  });

  const chat = await Chat.aggregate([
    {
      $match: {
        _id: groupChat._id,
      },
    },
    ...commonAggregationPipeline(),
  ]);

  const payload = chat[0];
  if (!payload) throw new ApiError(500, "Internal server error");

  payload.participants.forEach((participant) => {
    if (participant._id.toString() === req.user?._id.toString()) return;
    emitSocketEvent(
      req,
      participant._id,
      ChatEventEnum.NEW_CHAT_EVENT,
      payload
    );
  });

  return res
    .status(201)
    .json(new ApiResponse(201, payload, "GroupChat created successfully"));
});

const renameGrouphat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { name } = req.body;

  const chat = await Chat.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    isGroupChat: true,
  });
  if (!chat) throw new ApiError(404, "Group chat does not exists");

  if (chat.admin.toString() !== req.user?.id.toString())
    throw new ApiError(401, "You are not the admin");

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $set: {
        name: name || chat.name,
      },
    },
    {
      new: true,
    }
  );

  const groupChat = await Chat.aggregate([
    {
      $match: {
        _id: updatedChat._id,
      },
    },
    ...commonAggregationPipeline(),
  ]);

  const payload = groupChat[0];
  if (!payload) throw new ApiError(500, "Internal server error");

  updatedChat.participants.forEach((participant) => {
    if (participant.toString() === req.user?._id.toString()) return;
    emitSocketEvent(
      req,
      participant.toString(),
      ChatEventEnum.UPDATE_GROUP_NAME_EVENT,
      payload
    );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, payload, "Chat updated successfully"));
});

const addNewParticipantInTheGroup = asyncHandler(async (req, res) => {
  const { memberId, chatId } = req.body;

  const chat = await Chat.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    isGroupChat: true,
  });
  if (!chat) throw new ApiError(404, "groupChat does not exists");
  if (chat.admin.toString() === req.user?._id)
    throw new ApiError(401, "You are not the admin of the group");

  const existingMembers = chat.participants;

  if (existingMembers?.includes(memberId))
    throw new ApiError(400, "Member already in the group");

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: {
        participants: memberId,
      },
    },
    {
      new: true,
    }
  );

  const groupChat = await Chat.aggregate([
    {
      $match: {
        _id: updatedChat._id,
      },
    },
    ...commonAggregationPipeline(),
  ]);
  const payload = groupChat[0];

  if (!payload) throw new ApiError(500, "Internal server error");

  emitSocketEvent(req, memberId, ChatEventEnum.NEW_CHAT_EVENT, payload);

  return res
    .status(200)
    .json(new ApiError(200, payload, "New members added successfully"));
});

export {
  createOrGetSingleChat,
  deleteSingleChat,
  createGroupChat,
  renameGrouphat,
  addNewParticipantInTheGroup,
};
