import "bootstrap/dist/css/bootstrap.min.css";
import RegisterPage from "./pages/register";
import LoginPage from "./pages/login";
import { useAuth } from "./context/AuthContext";
import { Navigate, Route, Routes } from "react-router-dom";
import ChatPage from "./pages/chat";
import PrivateRoute from "./components/PrivateRoute";
import PublicRoute from "./components/PublicRoute";
import Loading from "./components/Loading";
import Redirect from "./pages/Redirect";

function App() {
  const { user, token } = useAuth();
  return (
    <Routes>
      <Route
        path="/"
        element={
          user?._id && token ? (
            <Navigate to={"/chat"} />
          ) : (
            <Navigate to={"/login"} />
          )
        }
      ></Route>
      <Route
        path="/chat"
        element={
          <PrivateRoute>
            <ChatPage />
          </PrivateRoute>
        }
      ></Route>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      ></Route>
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      ></Route>
      <Route path="/redirect" element={<Redirect />}></Route>

      <Route path="*" element={<p>404 Not found</p>} />
    </Routes>
  );
}

export default App;
