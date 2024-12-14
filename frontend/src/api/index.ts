import axios from "axios";
import { LocalStorage } from "../utils";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URI,
  withCredentials: true,
  timeout: 120000,
});

apiClient.interceptors.request.use(
  function (config) {
    const token = LocalStorage.get("token");
    //setting authorization header with bearer token
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  function (err) {
    return Promise.reject(err);
  }
);

const loginUser = (data: { field: string; password: string }) => {
  return apiClient.post("/users/login", data);
};

const registerUser = (data: {
  email: string;
  fullname: string;
  username: string;
  password: string;
}) => {
  return apiClient.post("/users/register", data);
};

const getCurrentUser = () => {
  return apiClient.get("/users/current-user");
};

const logoutUser = () => {
  return apiClient.post("/users/logout");
};

const updateAvatar = (file: File) => {
  const formData = new FormData();
  formData.append("avatar", file);

  return apiClient.patch("/users/update-avatar", formData);
};

const updateUserDetails = (fullname: string = "", email: string = "") => {
  return apiClient.patch("/users/update-account", {
    fullname: fullname,
    email: email,
  });
};

const getUserByQuery = (query: string) => {
  return apiClient.get("/users/search", {
    params: { query },
  });
};

const getAvailableUsers = () => {
  return apiClient.get("/chats/search");
};

const createSingleChat = (userId: string) => {
  return apiClient.post(`/chats/c/${userId}`);
};

const createGroupChat = (name: string, participants: string[]) => {
  return apiClient.post("/chats/group", {
    name,
    participants,
  });
};

const getAllChats = () => {
  return apiClient.get("/chats");
};

const getChatMessages = (chatId: string) => {
  return apiClient.get(`/messages/${chatId}`);
};

const sendMessage = (chatId: string, content: string, attachments: File[]) => {
  const formData = new FormData();
  if (content) {
    formData.append("content", content);
  }
  attachments?.map((file) => {
    formData.append("attachments", file);
  });
  return apiClient.post(`/messages/${chatId}`, formData);
};

const deleteMessage = (chatId: string, messageId: string) => {
  return apiClient.delete(`/messages/${chatId}/${messageId}`);
};

const addParticipant = (chatId: string, participantId: string) => {
  return apiClient.patch("/chats/group/add", {
    participantId,
    chatId,
  });
};

const removeParticipant = (chatId: string, participantId: string) => {
  return apiClient.patch("/chats/group/remove", {
    participantId,
    chatId,
  });
};

const leaveGroup = (chatId: string) => {
  return apiClient.patch(`/chats/group/leave/${chatId}`);
};

const deleteGroup = (chatId: string) => {
  return apiClient.delete(`/chats/group/delete/${chatId}`);
};

const updateGroup = (chatId: string, name: string, icon: File) => {
  const formData = new FormData();
  if (name) {
    formData.append("name", name);
  }
  if (icon) {
    formData.append("icon", icon);
  }
  return apiClient.patch(`/chats/group/update/${chatId}`, formData);
};

const deleteChat = (chatId: string) => {
  return apiClient.delete(`/chats/c/delete/${chatId}`);
};

export {
  loginUser,
  registerUser,
  getCurrentUser,
  logoutUser,
  updateAvatar,
  updateUserDetails,
  getUserByQuery,
  getAvailableUsers,
  createSingleChat,
  createGroupChat,
  getAllChats,
  getChatMessages,
  sendMessage,
  deleteMessage,
  addParticipant,
  removeParticipant,
  leaveGroup,
  deleteGroup,
  updateGroup,
  deleteChat,
};
