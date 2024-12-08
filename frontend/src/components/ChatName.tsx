import { Container } from "react-bootstrap";
import ProfileImage from "./ProfileImage";
import { formatDate } from "../utils";
import { ChatInterface } from "../interface/chat";
import { useAuth } from "../context/AuthContext";
import { UserInterface } from "../interface/user";

interface Props {
  chat: ChatInterface;
  isCurrentChat: boolean;
}

const ChatName: React.FC<Props> = ({ chat, isCurrentChat }) => {
  const { user } = useAuth();

  const profileUser = chat.participants.find(
    (participant) => participant._id !== user?._id
  ); //get receiver chat user profile info
  return (
    <>
      <Container
        fluid
        className={`chat-name px-0 py-1 ${isCurrentChat && "active"}`}
      >
        <div className="d-flex align-items-center p-2 px-3">
          <ProfileImage
            size="50px"
            src={chat.isGroupChat ? chat.icon : profileUser?.avatar}
            alt={chat.isGroupChat ? chat.name : profileUser?.username || ""}
          />
          <div
            className="ps-2 flex-grow-1 d-flex flex-column"
            style={{ fontWeight: "500" }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div
                className={`${chat.isGroupChat && "text-truncate w-60"}`}
                style={{ fontSize: "1.1rem" }}
              >
                {chat.isGroupChat ? chat.name : profileUser?.fullname}
              </div>
              <div className="text-secondary" style={{ fontSize: ".8rem" }}>
                {formatDate(chat.updatedAt)}
              </div>
            </div>
            <div
              className="text-secondary text-truncate"
              style={{
                maxWidth: "100%",
                fontSize: " .8rem",
              }}
            >
              {chat.lastMessage || <>&nbsp;</>}
            </div>
          </div>
        </div>
      </Container>
    </>
  );
};

export default ChatName;
