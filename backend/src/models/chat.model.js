import mongoose, { Schema } from "mongoose";

const chatSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    isGroupChat: {
      type: Boolean,
      required: true,
    },
    lastMessage: {
      type: mongoose.Types.ObjectId,
      ref: "Message",
    },
    participants: [
      {
        type: mongoose.Types.ObjectId,
        ref: "User",
      },
    ],
    admin: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Chat = mongoose.model("Chat", chatSchema);
