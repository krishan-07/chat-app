import { Container } from "react-bootstrap";
import ProfileImage from "./ProfileImage";
import { formatDate } from "../utils";
import { ChatInterface } from "../interface/chat";

interface Props {
  chat: ChatInterface;
  isCurrentChat: boolean;
}

const ChatName: React.FC<Props> = ({ chat, isCurrentChat }) => {
  return (
    <>
      <Container
        fluid
        className={`chat-name px-0 py-1 ${isCurrentChat && "active"}`}
      >
        <div className="d-flex align-items-center p-2 px-3">
          <ProfileImage size="50px" src={chat.icon} alt={chat.name} />
          <div
            className="ps-2 flex-grow-1 d-flex flex-column"
            style={{ fontWeight: "500" }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div
                className={`${chat.isGroupChat && "text-truncate w-60"}`}
                style={{ fontSize: "1.1rem" }}
              >
                {chat.name}
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
