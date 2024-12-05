import { Form, Spinner } from "react-bootstrap";
import { ChatInterface } from "../interface/chat";
import ProfileImage from "./ProfileImage";
import React, { useEffect, useState } from "react";
import { IoSendOutline } from "react-icons/io5";
import { MdOutlineEmojiEmotions } from "react-icons/md";
import { ImAttachment } from "react-icons/im";
import { getChatMessages } from "../api";
import { requestHandler } from "../utils";
import { MessageInterface } from "../interface/message";
import useBreakpoint from "../hooks/useBreakpoint";
import { IoIosArrowBack } from "react-icons/io";

interface Props {
  chat: ChatInterface;
  setShowSideBar: React.Dispatch<React.SetStateAction<boolean>>;
}

const ChatArea: React.FC<Props> = ({ chat, setShowSideBar }) => {
  const [message, setMesage] = useState(""); //To store the message
  const [messages, setMessages] = useState<MessageInterface[]>([]); //To store the current selected chat messages
  const [loadingMessages, setLoadingMessages] = useState(false); //To indicate loading of messages

  const breakPoint = useBreakpoint();
  const handleOpen = () => {
    if (breakPoint === "mobile") setShowSideBar(true);
  };

  const getMessages = async () => {
    // Make an async request to fetch chat messages for the current chat
    requestHandler(
      // Fetching messages for the current chat
      async () => await getChatMessages(chat._id || ""),
      // Set the state to loading while fetching the messages
      setLoadingMessages,
      // After fetching, set the chat messages to the state if available
      (res) => {
        const { data } = res;
        setMessages(data || []);
      },
      // Display any error alerts if they occur during the fetch
      alert
    );
  };

  useEffect(() => {
    getMessages();
  }, [chat._id]);

  return (
    <div className="d-flex flex-column" style={{ height: "100vh" }}>
      {/* Header Section */}
      <div
        style={{
          background: "rgb(15, 16, 18)",
          maxHeight: "62px",
        }}
      >
        <div
          className="d-flex align-items-center py-2 px-3"
          style={{ cursor: "default" }}
        >
          {breakPoint === "mobile" && (
            <div
              className="px-2 cursor-pointer back-arrow"
              onClick={handleOpen}
            >
              <IoIosArrowBack size={30} />
            </div>
          )}
          <ProfileImage src={chat.icon} alt={chat.name} size="45px" />
          <div className="ps-2">
            <div style={{ fontWeight: "500", lineHeight: "1.1" }}>
              {chat.name}
            </div>
            <div className="text-secondary" style={{ fontSize: ".8rem" }}>
              select for contact info
            </div>
          </div>
        </div>
      </div>

      {/* chat Section */}
      <div
        className="flex-grow-1 d-flex flex-column"
        style={{
          background:
            "url(https://res.cloudinary.com/krishan-07/image/upload/v1733393289/Screenshot_2024-12-05_153748_s0excm.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Chat Content */}
        <div className="flex-grow-1">
          {loadingMessages ? (
            <div className="center mt-3">
              <Spinner animation="border" role="status" />
            </div>
          ) : (
            <></>
          )}
        </div>

        {/* Typing section */}
        <div
          className="d-flex align-items-center"
          style={{
            height: "50px",
            background: "rgb(26 29 32)",
          }}
        >
          <div className="cursor-pointer p-2 center message-icons">
            <MdOutlineEmojiEmotions size={25} />
          </div>

          <div className="cursor-pointer p-2 center message-icons">
            <ImAttachment size={21} />
          </div>

          <div
            className="d-flex align-items-center px-1 flex-grow-1"
            style={{
              height: "40px",
            }}
          >
            <Form.Control
              type="text"
              placeholder="Type a message"
              className="custom-placeholder typing-input px-2"
              value={message}
              onChange={(e) => setMesage(e.target.value)}
            />
          </div>

          <div className="cursor-pointer p-2 center message-icons">
            <IoSendOutline size={25} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
