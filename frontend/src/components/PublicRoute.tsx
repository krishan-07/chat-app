import React, { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

const PublicRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();

  if (user?._id && token) return <Navigate to={"/chat"} replace />;

  return children;
};

export default PublicRoute;
