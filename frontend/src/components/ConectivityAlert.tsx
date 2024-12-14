import React, { useState, useEffect } from "react";
import { Alert } from "react-bootstrap";

const ConnectivityAlert: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [visible, setVisible] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setShow(true);
      setIsOnline(true);
      setVisible(true);
    };

    const handleOffline = () => {
      setShow(true);
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
    if (show) {
      const timer = setTimeout(() => setVisible(false), 3000);
      const time = setTimeout(() => setShow(false), 3100);

      return () => {
        clearTimeout(timer);
        clearTimeout(time);
      };
    }
  }, [show]);

  return (
    <>
      {show && (
        <div className="alert-container" style={{ zIndex: 2000 }}>
          <Alert
            variant={isOnline ? "success" : "danger"}
            className={`connectivity-alert ${
              visible ? "show" : "hide"
            } text-center mb-0 p-2`}
            style={{ width: "max-content", margin: "auto" }}
          >
            {isOnline
              ? "You are back online."
              : "You are offline. Please check your internet connection."}
          </Alert>
        </div>
      )}
    </>
  );
};

export default ConnectivityAlert;
