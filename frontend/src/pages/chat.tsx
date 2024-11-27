import { Button } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";

function ChatPage() {
  const { logout } = useAuth();
  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      <div className="center mt-5">
        <Button variant="primary" type="button" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </>
  );
}

export default ChatPage;
