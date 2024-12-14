import React, { createContext, useContext, useState } from "react";

interface ErrorContextProps {
  errors: string[];
  addError: (error: string) => void;
  removeError: (index: number) => void;
}

const ErrorContext = createContext<ErrorContextProps | undefined>(undefined);

export const ErrorProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [errors, setErrors] = useState<string[]>([]);

  const addError = (error: string) => {
    setErrors((prev) => [...prev, error]);
  };

  const removeError = (index: number) => {
    setErrors((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <ErrorContext.Provider value={{ errors, addError, removeError }}>
      {children}
    </ErrorContext.Provider>
  );
};

export const useErrorContext = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error("useErrorContext must be used within an ErrorProvider");
  }
  return context;
};
