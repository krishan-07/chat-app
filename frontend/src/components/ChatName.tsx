import { Container } from "react-bootstrap";
import ProfileImage from "./ProfileImage";
import { formatDate } from "../utils";
import { ChatInterface } from "../interface/chat";
import { useAuth } from "../context/AuthContext";

interface Props {
  chat: ChatInterface;
  isActive: boolean;
  unreadMessages: number;
}

const ChatName: React.FC<Props> = ({ chat, isActive, unreadMessages }) => {
  const { user } = useAuth();

  const participants = chat.participants.filter(
    (participant) => participant._id !== user?._id
  ); //get participants details of the chat excluding the current user

  const getAttachmentContent = (chat: string) => {
    if (/\.(docx|pdf|xls|xlsx|pptx|txt|csv)$/i.test(chat))
      return "📁" + chat.split("/").pop()?.split(".").pop();
    else if (/\.(jpg|jpeg|png|gif|svg|webp|bmp|tiff|heif|heic)$/i.test(chat))
      return "📷 photo";
    else return "📷 video";
  };

  const content = chat.lastMessage?.content
    ? chat.lastMessage.content
    : getAttachmentContent(chat.lastMessage?.attachments[0]?.url);

  return (
    <>
      <Container
        fluid
        className={`chat-name px-0 py-1 ${isActive && "active"} w-100`}
      >
        <div className="d-flex align-items-center p-2 px-3">
          <ProfileImage
            size="50px"
            src={chat.isGroupChat ? chat.icon : participants[0]?.avatar}
            alt={chat.isGroupChat ? chat.name : participants[0]?.username || ""}
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
                {chat.isGroupChat ? chat.name : participants[0]?.fullname}
              </div>
              <div className="text-secondary" style={{ fontSize: ".8rem" }}>
                {formatDate(chat.updatedAt)}
              </div>
            </div>
            <div
              className="text-secondary"
              style={{
                fontSize: " .8rem",
              }}
            >
              {chat.lastMessage ? (
                chat.isGroupChat ? (
                  <>
                    <Container
                      fluid
                      className="d-flex align-items-center px-0 fw-normal"
                    >
                      {chat.lastMessage?.sender?._id === user?._id ? (
                        <>
                          <div className="text-primary me-1 opacity-50">
                            you:
                          </div>
                          <div
                            className="text-light opacity-70 flex-grow-1 text-truncate "
                            style={{ width: "100px" }}
                          >
                            {content}
                          </div>
                          {!!unreadMessages && (
                            <div
                              className="align-self-end bg-primary p-1 px-2 text-light badge"
                              style={{ borderRadius: "25px" }}
                            >
                              {unreadMessages}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="text-primary me-1 opacity-50 text-nowrap">
                            {chat?.lastMessage?.sender?.fullname}
                          </div>
                          <div
                            className="text-light opacity-70 flex-grow-1 text-truncate "
                            style={{ width: "100px" }}
                          >
                            {content}
                          </div>
                          {!!unreadMessages && (
                            <div
                              className="align-self-end bg-primary p-1 px-2 text-light badge"
                              style={{ borderRadius: "25px" }}
                            >
                              {unreadMessages}
                            </div>
                          )}
                        </>
                      )}
                    </Container>
                  </>
                ) : (
                  <Container
                    fluid
                    className="d-flex align-items-center px-0 fw-normal"
                  >
                    {chat.lastMessage?.sender?._id === user?._id ? (
                      <>
                        <div className="text-primary me-1 opacity-50">you:</div>
                        <div
                          className="text-light opacity-70 flex-grow-1 text-truncate "
                          style={{ width: "100px" }}
                        >
                          {content}
                        </div>
                        {!!unreadMessages && (
                          <div
                            className="align-self-end bg-primary p-1 px-2 text-light badge"
                            style={{ borderRadius: "25px" }}
                          >
                            {unreadMessages}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div
                          className="text-light opacity-70 flex-grow-1 text-truncate "
                          style={{ width: "100px" }}
                        >
                          {content}
                        </div>
                        {!!unreadMessages && (
                          <div
                            className="align-self-end bg-primary p-1 px-2 text-light badge"
                            style={{ borderRadius: "25px" }}
                          >
                            {unreadMessages}
                          </div>
                        )}
                      </>
                    )}
                  </Container>
                )
              ) : (
                <>&nbsp;</>
              )}
            </div>
          </div>
        </div>
      </Container>
    </>
  );
};

export default ChatName;
