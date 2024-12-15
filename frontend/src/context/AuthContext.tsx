import React, { createContext, useContext, useEffect, useState } from "react";
import { UserInterface } from "../interface/user";
import { LocalStorage, requestHandler } from "../utils";
import { getCurrentUser, loginUser, logoutUser, registerUser } from "../api";
import { useNavigate } from "react-router-dom";
import Loading from "../components/Loading";
import { useErrorContext } from "./ErrorContext";

const AuthContext = createContext<{
  user: UserInterface | null;
  token: string | null;
  login: (data: { field: string; password: string }) => Promise<void>;
  register: (data: {
    email: string;
    username: string;
    fullname: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  Auth: (accessToken: any) => Promise<void>;
}>({
  user: null,
  token: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  Auth: async () => {},
});

//create a hook for AuthContext
export const useAuth = () => useContext(AuthContext);

//create a component that provide authentication related functions
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { addError } = useErrorContext();

  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<UserInterface | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const navigate = useNavigate();

  const login = async (data: { field: string; password: string }) => {
    await requestHandler(
      async () => await loginUser(data),
      setIsLoading,
      (res) => {
        const { data } = res;
        setUser(data.user);
        setToken(data.accessToken);
        LocalStorage.set("user", data.user);
        LocalStorage.set("token", data.accessToken);
        navigate("/chat");
      },
      addError
    );
  };

  const register = async (data: {
    email: string;
    fullname: string;
    password: string;
    username: string;
  }) => {
    await requestHandler(
      async () => await registerUser(data),
      setIsLoading,
      (res) => {
        const { data } = res;
        setUser(data.user);
        setToken(data.accessToken);
        LocalStorage.set("user", data.user);
        LocalStorage.set("token", data.accessToken);
        navigate("/register-redirect");
      },
      addError
    );
  };

  const logout = async () => {
    await requestHandler(
      async () => await logoutUser(),
      setIsLoading,
      () => {
        setUser(null);
        setToken(null);
        LocalStorage.clear();
        navigate("/login");
      },
      addError
    );
  };

  const Auth = async (accessToken: string) => {
    await requestHandler(
      async () => await getCurrentUser(),
      setIsLoading,
      (res) => {
        const { data } = res;
        setUser(data);
        setToken(accessToken);
        LocalStorage.set("user", data);
        navigate("/chat");
      },
      addError
    );
  };

  useEffect(() => {
    setIsLoading(true);
    const _user = LocalStorage.get("user");
    const _token = LocalStorage.get("token");
    if (_user?._id && _token) {
      setUser(_user);
      setToken(_token);
    }
    setIsLoading(false);
  }, []);

  return (
    <>
      <AuthContext.Provider
        value={{ user, login, token, register, logout, Auth }}
      >
        {isLoading ? <Loading /> : children}
      </AuthContext.Provider>
    </>
  );
};
