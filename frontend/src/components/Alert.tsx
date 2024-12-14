import React from "react";
import { Alert } from "react-bootstrap";
import { AlertInterface } from "../interface/alert";

interface AlertContainerProps {
  alert: AlertInterface | null;
}

const AlertContainer: React.FC<AlertContainerProps> = ({ alert }) => {
  return (
    <>
      <div className="alert-container">
        {alert && (
          <Alert
            key={alert.id}
            variant={alert.variant}
            className="p-2 connectivity-alert"
            style={{ width: "max-content", margin: "auto" }}
          >
            {alert.message}
          </Alert>
        )}
      </div>
    </>
  );
};

export default AlertContainer;
