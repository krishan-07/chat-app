import { Container } from "react-bootstrap";
import ProfileImage from "./ProfileImage";
import { extractParamsfromSearchUrl, formatDate } from "../utils";

interface Props {
  src: string;
  name: string;
  chatId: string;
  lastUpdated: string;
  lastMessage: string;
}

const ChatName: React.FC<Props> = ({
  src,
  name,
  chatId,
  lastUpdated,
  lastMessage,
}) => {
  const currentChatId = extractParamsfromSearchUrl(
    window.location.href,
    "chatId"
  );

  return (
    <>
      <Container
        fluid
        className={`chat-name px-0 py-1 ${
          currentChatId === chatId && "active"
        }`}
      >
        <div className="d-flex align-items-center p-2">
          <div className="ps-1">
            <ProfileImage size="50px" src={src} alt={name} />
          </div>
          <div className="ps-2 flex-grow-1" style={{ fontWeight: "500" }}>
            <div className="d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center">
                <div
                  className="fs-5"
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "70%",
                  }}
                >
                  {name}
                </div>
                <div className="text-secondary" style={{ fontSize: ".8rem" }}>
                  {formatDate(lastUpdated)}
                </div>
              </div>
              <div
                className="text-secondary"
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                  fontSize: " .8rem",
                }}
              >
                {lastMessage || <>&nbsp;</>}
              </div>
            </div>
          </div>
        </div>
      </Container>
      <hr className="m-0" />
    </>
  );
};

export default ChatName;
