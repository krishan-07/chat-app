import { Button, Card, Col, Container, Row, Spinner } from "react-bootstrap";
import { ChatInterface } from "../interface/chat";
import ProfileImage from "./ProfileImage";
import React, { useEffect, useRef, useState } from "react";
import { IoSendOutline } from "react-icons/io5";
import { MdOutlineEmojiEmotions } from "react-icons/md";
import { ImAttachment } from "react-icons/im";
import { getChatMessages, sendMessage } from "../api";
import { formatDate, requestHandler } from "../utils";
import { MessageInterface } from "../interface/message";
import useBreakpoint from "../hooks/useBreakpoint";
import { IoIosArrowBack } from "react-icons/io";
import { useSocket } from "../context/SocketContext";
import { ChatEventEnum } from "../utils/constants";
import { useAuth } from "../context/AuthContext";
import TextareaAutosize from "react-textarea-autosize";

interface Props {
  chat: ChatInterface;
  setShowSideBar: React.Dispatch<React.SetStateAction<boolean>>;
  setChats: React.Dispatch<React.SetStateAction<ChatInterface[]>>;
  setUnreadMessages: React.Dispatch<React.SetStateAction<MessageInterface[]>>;
  updateChatLastMessage: (chatId: string, message: MessageInterface) => void;
}

//function ensures the object is of type MessageInterface by checking for the _id property.
function isMessageInterface(
  message: MessageInterface | { timeStamp?: string }
): message is MessageInterface {
  return (message as MessageInterface)._id !== undefined;
}

const refactorMessages = (messages: MessageInterface[]) => {
  return messages.reduce((acc, curr, i, arr) => {
    const currentDate = new Date(curr.createdAt).toISOString().split("T")[0];
    acc.push(curr); // Add the current message

    // Add a timestamp if:
    // - It's the last message
    // - The date changes in the next message
    const nextMessage = arr[i + 1];
    if (
      !nextMessage ||
      currentDate !==
        new Date(nextMessage.createdAt).toISOString().split("T")[0]
    ) {
      acc.push({ timeStamp: curr.createdAt });
    }

    return acc;
  }, [] as Array<{ timeStamp?: string } | MessageInterface>);
};

const ChatArea: React.FC<Props> = ({
  chat,
  setShowSideBar,
  setUnreadMessages,
  updateChatLastMessage,
}) => {
  //import socket hook
  const { socket } = useSocket();
  const { user } = useAuth();

  const profileUser = chat.participants.find(
    (participant) => participant._id !== user?._id
  ); //get receiver chat user profile info

  const [message, setMessage] = useState(""); //To store the currently typed message
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]); // To store files attached to messages

  const [messages, setMessages] = useState<MessageInterface[]>([]); //To store the message
  const [loadingMessages, setLoadingMessages] = useState(false); //To indicate loading of messages
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null); //To handle auto scroll

  //To handle function while in mobile
  const breakPoint = useBreakpoint();
  const handleOpen = () => {
    if (breakPoint === "mobile") setShowSideBar(true);
  };

  const getMessages = async () => {
    // Check if socket is available, if not, show an alert
    if (!socket) return alert("Socket not available");

    // Emit an event to join the current chat
    socket.emit(ChatEventEnum.JOIN_CHAT_EVENT, chat._id);

    // Make an async request to fetch chat messages for the current chat
    requestHandler(
      // Fetching messages for the current chat
      async () => await getChatMessages(chat._id),
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

  const sendChatMessage = async () => {
    if (!socket) return; //if there is no socket connection return

    if (!message.trim && !attachedFiles.length) return;

    // Emit a STOP_TYPING_EVENT to inform other users/participants that typing has stopped
    socket.emit(ChatEventEnum.STOP_TYPING_EVENT, chat._id);

    await requestHandler(
      async () => await sendMessage(chat._id, message, attachedFiles),
      setSending,
      (res) => {
        setMessage(""); // Clear the message input
        setAttachedFiles([]); // Clear the list of attached files
        setMessages((prev) => [res.data, ...prev]); // Update messages in the UI
        updateChatLastMessage(chat._id || "", res.data);
      },
      alert
    );
  };

  const onMessageReceived = (message: MessageInterface) => {
    //check if the message received belongs to current chat_id
    // If it belongs to the current chat, update the messages list for the active chat
    if (message.chat === chat._id) setMessages((prev) => [message, ...prev]);
    // If it belongs to the current chat, update the messages list for the active chat
    else setUnreadMessages((prev) => [message, ...prev]);

    updateChatLastMessage(message.chat || "", message);
  };

  useEffect(() => {
    if (!socket) return;

    socket.on(ChatEventEnum.MESSAGE_RECEIVED_EVENT, onMessageReceived);

    return () => {
      socket.off(ChatEventEnum.MESSAGE_RECEIVED_EVENT, onMessageReceived);
    };
  }, [socket, chat._id]);

  useEffect(() => {
    getMessages();
  }, [chat._id]);

  useEffect(() => {
    // Scroll to the bottom when the component mounts or new message is sent ot received
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="d-flex flex-column" style={{ height: "100%" }}>
      {/* Header Section */}
      <div className="chat-header">
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
          <ProfileImage
            src={chat.isGroupChat ? chat.icon : profileUser?.avatar}
            alt={chat.isGroupChat ? chat.name : profileUser?.fullname || ""}
            size="45px"
          />
          <div className="ps-2">
            <div style={{ fontWeight: "500", lineHeight: "1.1" }}>
              {chat.isGroupChat ? chat.name : profileUser?.fullname}
            </div>
            <div className="text-secondary" style={{ fontSize: ".8rem" }}>
              select for contact info
            </div>
          </div>
        </div>
      </div>

      {/* chat Section */}
      <div
        className="chat-background flex-grow-1"
        style={{ overflowY: "auto" }}
      >
        {loadingMessages ? (
          <div className="center mt-3">
            <Spinner animation="border" role="status" />
          </div>
        ) : (
          <Container fluid>
            {[...refactorMessages(messages)].reverse().map((message, index) => {
              if ("timeStamp" in message) {
                return (
                  <Row key={`timestamp-${index}`} className="mb-2 mt-1">
                    <div className="center">
                      <span className="time-stamp px-2 py-1">
                        {message.timeStamp &&
                          formatDate(message.timeStamp, false)}
                      </span>
                    </div>
                  </Row>
                );
              }

              if (isMessageInterface(message)) {
                return (
                  <Row
                    key={message._id}
                    className={`mb-2 message-container ${
                      user?._id === message.sender._id ? "sender" : "receiver"
                    }`}
                  >
                    <Col
                      className={
                        user?._id === message.sender._id
                          ? "d-flex justify-content-end"
                          : "d-flex justify-content-start"
                      }
                    >
                      <Card
                        className={`message-bubble ${
                          user?._id === message.sender._id
                            ? "sender-bubble"
                            : "receiver-bubble"
                        }`}
                      >
                        <Card.Body className="p-1 d-flex flex-column">
                          <div className="message-text">{message.content}</div>
                          <div className="chat-time-stamp d-flex justify-content-end">
                            {formatDate(message.updatedAt)}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                );
              }

              return null; // Fallback for unhandled cases (should not occur)
            })}
          </Container>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Typing section */}
      <div className="chat-typing d-flex align-items-center">
        <div className="cursor-pointer p-2 center message-icons">
          <MdOutlineEmojiEmotions size={25} />
        </div>

        <div className="cursor-pointer p-2 center message-icons">
          <ImAttachment size={21} />
        </div>

        <div className="d-flex align-items-center px-1 flex-grow-1 my-2">
          <TextareaAutosize
            value={message}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
              setMessage(event.target.value);
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === "Enter" && e.shiftKey) {
                e.preventDefault();
                setMessage((prevValue) => prevValue + "\n");
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
              }
            }}
            minRows={1}
            maxRows={3}
            className="typing-input custom-placeholder w-100 p-2"
            placeholder="Type a message..."
            style={{ resize: "none" }}
          />
        </div>

        <Button
          variant="dark"
          className="p-2 center message-icons"
          size="sm"
          style={{ background: "transparent" }}
          disabled={sending || (!message.trim() && !attachedFiles.length)}
          onClick={sendChatMessage}
        >
          {sending ? (
            <Spinner animation="border" role="status" size="sm" />
          ) : (
            <IoSendOutline size={22} />
          )}
        </Button>
      </div>
    </div>
  );
};

export default ChatArea;
