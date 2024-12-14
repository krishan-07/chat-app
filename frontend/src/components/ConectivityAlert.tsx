import React, { useState, useEffect } from "react";
import { Alert } from "react-bootstrap";

const ConnectivityAlert: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setVisible(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setVisible(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [visible]);

  return (
    <div className="alert-container">
      <Alert
        variant={isOnline ? "success" : "danger"}
        className={`connectivity-alert ${
          visible ? "show" : "hide"
        } text-center mb-0 p-2`}
      >
        {isOnline
          ? "You are back online."
          : "You are offline. Please check your internet connection."}
      </Alert>
    </div>
  );
};

export default ConnectivityAlert;
