import React, { createContext, useContext, useEffect, useState } from "react";
import { LocalStorage } from "../utils";
import { io, Socket } from "socket.io-client";
import { ChatEventEnum } from "../utils/constants";
import { ChatInterface } from "../interface/chat";
import { MessageInterface } from "../interface/message";

// Define types for events
interface ServerToClientEvents {
  [ChatEventEnum.CONNECTED_EVENT]: () => void;
  [ChatEventEnum.DISCONNECT_EVENT]: () => void;
  [ChatEventEnum.NEW_CHAT_EVENT]: (chat: ChatInterface) => void;
  [ChatEventEnum.MESSAGE_RECEIVED_EVENT]: (message: MessageInterface) => void;
  [ChatEventEnum.TYPING_EVENT]: (chatId: string) => void;
  [ChatEventEnum.STOP_TYPING_EVENT]: (chatId: string) => void;
  [ChatEventEnum.MESSAGE_DELETE_EVENT]: (message: MessageInterface) => void;
}

interface ClientToServerEvents {
  [ChatEventEnum.JOIN_CHAT_EVENT]: (chatId: string) => void;
  [ChatEventEnum.TYPING_EVENT]: (chatId: string) => void;
  [ChatEventEnum.STOP_TYPING_EVENT]: (chatId: string) => void;
}

// Create a context to hold the socket instance
interface SocketContextType {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
}
const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Custom hook to use the socket context
const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

// Function to establish a socket connection with an authorization token
const getSocket = (): Socket<
  ServerToClientEvents,
  ClientToServerEvents
> | null => {
  const token = LocalStorage.get("token");
  if (!token) {
    console.warn("No token found for socket connection.");
    return null;
  }

  return io(import.meta.env.VITE_SOCKET_URI, {
    withCredentials: true,
    auth: { token },
  });
};

// SocketProvider component to manage the socket instance and provide it through context
const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);

  // Set up the socket connection when the component mounts
  useEffect(() => {
    const newSocket = getSocket();
    if (newSocket) {
      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        newSocket.disconnect();
      };
    }
  }, []);

  return (
    // Provide the socket instance through context to its children
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

// Export the SocketProvider component and the useSocket hook for other components to use
export { SocketProvider, useSocket };
