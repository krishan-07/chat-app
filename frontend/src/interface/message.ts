import { UserInterface } from "./user";

export interface MessageInterface {
  _id: string;
  sender: Pick<
    UserInterface,
    "_id" | "avatar" | "email" | "username" | "fullname"
  >;
  content: string;
  chat: string;
  attachments: {
    url: string;
    type: string;
  }[];
  createdAt: string;
  updatedAt: string;
}
