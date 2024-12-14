import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { BrowserRouter } from "react-router-dom";
import { SocketProvider } from "./context/SocketContext.tsx";
import ConnectivityAlert from "./components/ConectivityAlert.tsx";
import { ErrorProvider } from "./context/ErrorContext.tsx";
import GlobalErrorAlert from "./components/GlobalErrorAlert.tsx";
import { AlertProvider } from "./context/AlertContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorProvider>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <AlertProvider>
              <ConnectivityAlert />
              <GlobalErrorAlert />
              <App />
            </AlertProvider>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorProvider>
  </StrictMode>
);
