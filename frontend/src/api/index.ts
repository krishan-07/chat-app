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

  return apiClient.patch("/users/update-avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
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

const createSingleChat = (userId: string) => {
  return apiClient.post(`/chats/c/${userId}`);
};

const createGroupChat = (name: string, participants: string[]) => {
  return apiClient.post("/chats/group", {
    name,
    participants,
  });
};

export {
  loginUser,
  registerUser,
  getCurrentUser,
  logoutUser,
  updateAvatar,
  updateUserDetails,
  getUserByQuery,
  createSingleChat,
  createGroupChat,
};
