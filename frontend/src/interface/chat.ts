interface ChatInterface {
  _id: string;
  name: string;
  icon: string;
  isGroupChat: boolean;
  lastMessage: string;
  participants: string[];
  admin: string;
  createdAt: string;
  updatedAt: string;
}
