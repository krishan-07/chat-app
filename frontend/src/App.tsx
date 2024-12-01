import "bootstrap/dist/css/bootstrap.min.css";
import RegisterPage from "./pages/Register";
import LoginPage from "./pages/Login";
import { useAuth } from "./context/AuthContext";
import { Navigate, Route, Routes } from "react-router-dom";
import ChatPage from "./pages/Chat";
import PrivateRoute from "./components/PrivateRoute";
import PublicRoute from "./components/PublicRoute";
import Redirect from "./pages/Redirect";
import PostRegister from "./pages/PostRegister";

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
      <Route path="/register-redirect" element={<PostRegister />}></Route>

      <Route path="*" element={<p>404 Not found</p>} />
    </Routes>
  );
}

export default App;
