import { MessageInterface } from "./message";
import { UserInterface } from "./user";

export interface ChatInterface {
  _id: string;
  name: string;
  icon: string;
  isGroupChat: boolean;
  lastMessage: MessageInterface;
  participants: UserInterface[];
  admin: string;
  createdAt: string;
  updatedAt: string;
}
