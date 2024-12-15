import React from "react";
import { Alert, Button } from "react-bootstrap";
import { useErrorContext } from "../context/ErrorContext";
import { IoClose } from "react-icons/io5";

const GlobalErrorAlert: React.FC = () => {
  const { errors, removeError } = useErrorContext();

  return (
    <div className="alert-container">
      {errors.map((error: string, index: number) => (
        <Alert
          key={index}
          variant="danger"
          className="alert-container d-flex align-items-center p-2 px-3 gap-1"
          style={{ width: "90%" }}
        >
          <div className="flex-grow-1" title={error}>
            {error}
          </div>
          <Button
            variant="danger-outline p-1"
            onClick={() => removeError(index)}
            style={{
              background: "transparent",
              color: "red",
            }}
          >
            <IoClose size={25} />
          </Button>
        </Alert>
      ))}
    </div>
  );
};

export default GlobalErrorAlert;
