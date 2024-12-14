import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/ayncHandler.js";
import { User } from "../models/user.model.js";
import { Chat } from "../models/chat.model.js";
import { emitSocketEvent } from "../socket/index.js";
import { ChatEventEnum, DefaultProfileUrl } from "../constants.js";
import { Message } from "../models/message.model.js";
import {
  extractPublicIdFromUrl,
  removeFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

const removeLocalFile = (filePath) => {
  if (filePath) fs.unlinkSync(filePath);
  return null;
};

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
        from: "messages",
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
                    fullname: 1,
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

  const response = await Message.deleteMany({
    chat: new mongoose.Types.ObjectId(chatId),
  });
  if (response.deletedCount !== messages.length) {
    throw new ApiError(
      500,
      `Mismatch in deleted messages count. Expected: ${
        messages.length - 1
      }, Deleted: ${response.deletedCount}`
    );
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
            participants: { $elemMatch: { $eq: req.user?._id } },
          },
          {
            participants: {
              $elemMatch: { $eq: new mongoose.Types.ObjectId(receiverId) },
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
    name: "One on one chat",
    participants: [req.user?._id, new mongoose.Types.ObjectId(receiverId)],
    admin: req.user?._id,
    isGroupChat: false,
  });

  const createdChat = await Chat.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(newChatInstance._id),
      },
    },
    ...commonAggregationPipeline(),
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
    emitSocketEvent(
      req,
      participant.toString(),
      ChatEventEnum.LEAVE_CHAT_EVENT,
      chat
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

  const members = [...new Set([...participants, req.user?._id])];

  if (members.length < 2)
    throw new ApiError(400, "A group should contain more than 1 members");

  const groupChat = await Chat.create({
    name: name.trim() || "Group chat",
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
      participant._id.toString(),
      ChatEventEnum.NEW_CHAT_EVENT,
      payload
    );
  });

  return res
    .status(201)
    .json(new ApiResponse(201, payload, "GroupChat created successfully"));
});

const updateGroupChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { name } = req.body;

  const chat = await Chat.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    isGroupChat: true,
  });
  if (!chat) throw new ApiError(404, "Group chat does not exists");

  if (chat.admin.toString() !== req.user?.id.toString())
    throw new ApiError(401, "You are not the admin");

  let groupIcon;
  if (req.file?.path) {
    groupIcon = await uploadOnCloudinary(req.file?.path);
    if (!groupIcon?.url) {
      removeLocalFile(req.file?.path);
      throw new ApiError(500, "Error while uploading on cloudinary");
    } else {
      if (chat.icon !== DefaultProfileUrl) {
        const response = await removeFromCloudinary(
          extractPublicIdFromUrl(chat.icon)
        );

        if (response !== "ok")
          throw new ApiError(400, "Error while removing the old file");
      }
    }
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $set: {
        name: name || chat.name,
        icon: groupIcon?.url || chat.icon,
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
      ChatEventEnum.UPDATE_GROUP_EVENT,
      payload
    );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, payload, "Chat updated successfully"));
});

const addNewParticipantInTheGroup = asyncHandler(async (req, res) => {
  const { participantId, chatId } = req.body;

  const chat = await Chat.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    isGroupChat: true,
  });
  if (!chat) throw new ApiError(404, "groupChat does not exists");
  if (chat.admin.toString() !== req.user?._id.toString())
    throw new ApiError(401, "You are not the admin of the group");

  const existingMembers = chat.participants;

  if (existingMembers?.includes(participantId))
    throw new ApiError(400, "Member already in the group");

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: {
        participants: participantId,
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

  emitSocketEvent(req, participantId, ChatEventEnum.NEW_CHAT_EVENT, payload);

  chat.participants.forEach((participant) => {
    emitSocketEvent(
      req,
      participant.toString(),
      ChatEventEnum.PARTICIPANT_JOINED,
      payload
    );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, payload, "New members added successfully"));
});

const removeParticipantFromTheGroup = asyncHandler(async (req, res) => {
  const { chatId, participantId } = req.body;

  const chat = await Chat.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    isGroupChat: true,
  });
  if (!chat) throw new ApiError(404, "GroupChat doesnot exists");

  if (chat.admin.toString() !== req.user?._id.toString())
    throw new ApiError(
      401,
      "Cannot perform this action, you are not the admin"
    );
  if (!chat.participants.includes(participantId))
    throw new ApiError(404, "No such participants found to be removed");

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: {
        participants: participantId,
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

  emitSocketEvent(req, participantId, ChatEventEnum.LEAVE_CHAT_EVENT, payload);

  updatedChat.participants.forEach((participants) => {
    emitSocketEvent(
      req,
      participants.toString(),
      ChatEventEnum.PARTICIPANT_LEFT,
      payload
    );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, payload, "Participant removed successfully"));
});

const leaveGroupChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const groupChat = await Chat.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    isGroupChat: true,
  });
  if (!groupChat) throw new ApiError(404, "GroupChat does not exits");

  if (!groupChat.participants.includes(req.user?._id.toString()))
    throw new ApiError(400, "You are not a participant in the group");

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: {
        participants: req.user?._id,
      },
    },
    {
      new: true,
    }
  );

  const payload = (
    await Chat.aggregate([
      {
        $match: {
          _id: updatedChat._id,
        },
      },
      ...commonAggregationPipeline(),
    ])
  )[0];
  if (!payload) throw new ApiError(500, "Internal sever error");

  emitSocketEvent(
    req,
    req.user?._id.toString(),
    ChatEventEnum.LEAVE_CHAT_EVENT,
    payload
  );

  updatedChat.participants.forEach((participant) => {
    emitSocketEvent(
      req,
      participant.toString(),
      ChatEventEnum.PARTICIPANT_LEFT,
      payload
    );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, payload, "Group left successfully"));
});

const deleteGroupChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const groupChat = await Chat.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    isGroupChat: true,
  });
  if (!groupChat) throw new ApiError(404, "GroupChat doesnot exists");

  if (groupChat.admin.toString() !== req.user?._id.toString())
    throw new ApiError(400, "You are not the admin");

  await Chat.findByIdAndDelete(chatId);
  await deleteCascadeChatMessages(chatId);

  groupChat.participants.forEach((participant) => {
    emitSocketEvent(
      req,
      participant.toString(),
      ChatEventEnum.LEAVE_CHAT_EVENT,
      groupChat
    );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "GroupChat deleted successfully"));
});

const getGroupChatDetails = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const groupChat = await Chat.aggregate([
    {
      $match: {
        _id: mongoose.Types.ObjectId(chatId),
        isGroupChat: true,
      },
    },
    ...commonAggregationPipeline(),
  ]);
  if (!groupChat.length) throw new ApiError(404, "GroupChat doesnot exists");

  return res
    .status(200)
    .json(new ApiResponse(200, groupChat[0], "GroupChat fetched successfully"));
});

const searchAvailableUser = asyncHandler(async (req, res) => {
  const users = await User.aggregate([
    {
      $match: {
        _id: {
          $ne: req.user?._id,
        },
      },
    },
    {
      $project: {
        username: 1,
        fullname: 1,
        avatar: 1,
        email: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched successfully"));
});

const getAllChats = asyncHandler(async (req, res) => {
  const chats = await Chat.aggregate([
    {
      $match: {
        participants: { $elemMatch: { $eq: req.user?._id } },
      },
    },
    {
      $sort: {
        updatedAt: -1,
      },
    },
    ...commonAggregationPipeline(),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, chats || [], "Chats fetched successfully"));
});

export {
  createOrGetSingleChat,
  deleteSingleChat,
  createGroupChat,
  updateGroupChat,
  addNewParticipantInTheGroup,
  removeParticipantFromTheGroup,
  leaveGroupChat,
  deleteGroupChat,
  getGroupChatDetails,
  searchAvailableUser,
  getAllChats,
};
