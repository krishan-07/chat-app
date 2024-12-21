import React, { createContext, useContext } from "react";
import { NotificationSound } from "../utils";

interface NotificationContextProps {
  showNotification: (message: {
    id: string;
    sender: string;
    text: string;
  }) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(
  undefined
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const showNotification = (message: {
    id: string;
    sender: string;
    text: string;
  }) => {
    const notificationSound = new NotificationSound();

    if (Notification.permission === "granted" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(message.sender, {
          body: message.text,
          icon: "/icon.svg",
          data: { url: "https://chat-app-gules-pi.vercel.app/" },
        });
      });
      notificationSound.play();
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};
