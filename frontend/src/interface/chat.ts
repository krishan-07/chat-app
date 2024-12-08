import { UserInterface } from "./user";

export interface ChatInterface {
  _id: string;
  name: string;
  icon: string;
  isGroupChat: boolean;
  lastMessage: string;
  participants: UserInterface[];
  admin: string;
  createdAt: string;
  updatedAt: string;
}
