import React, { createContext, useContext, useState, ReactNode } from "react";
import { AlertColor, AlertInterface } from "../interface/alert";
import AlertContainer from "../components/Alert";

interface AlertContextProps {
  showAlert: (message: string, variant?: AlertColor, duration?: number) => void;
}

const AlertContext = createContext<AlertContextProps | undefined>(undefined);

export const useAlertContext = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlertContext must be used within an AlertProvider");
  }
  return context;
};

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [alert, setAlert] = useState<AlertInterface | null>(null);

  const showAlert = (
    message: string,
    variant: AlertColor = "info",
    duration?: number
  ) => {
    const id = Date.now(); // Unique ID for the alert
    setAlert({ id, message, variant });

    // Automatically remove the alert after the specified duration
    if (duration)
      setTimeout(() => {
        setAlert(null);
      }, duration);
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      <AlertContainer alert={alert} />
      {children}
    </AlertContext.Provider>
  );
};
