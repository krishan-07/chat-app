import { Button, Card, Col, Container, Row, Spinner } from "react-bootstrap";
import { ChatInterface } from "../interface/chat";
import ProfileImage from "./ProfileImage";
import React, { useEffect, useRef } from "react";
import { IoSendOutline } from "react-icons/io5";
import { MdOutlineEmojiEmotions } from "react-icons/md";
import { ImAttachment } from "react-icons/im";
import { formatDate } from "../utils";
import { MessageInterface } from "../interface/message";
import useBreakpoint from "../hooks/useBreakpoint";
import { IoIosArrowBack } from "react-icons/io";
import { useAuth } from "../context/AuthContext";
import TextareaAutosize from "react-textarea-autosize";
import { UserInterface } from "../interface/user";

interface Props {
  chat: ChatInterface;
  setShowSideBar: React.Dispatch<React.SetStateAction<boolean>>;
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  messages: MessageInterface[];
  loadingMessages: boolean;
  isTyping: boolean;
  handleMessageChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  sendMessage: () => Promise<void>;
  disabled: boolean;
  sending: boolean;
}

interface NewMessageInterface extends MessageInterface {
  senderName: string;
}

//function ensures the object is of type MessageInterface by checking for the _id property.
function isMessageInterface(
  message: MessageInterface | { timeStamp?: string }
): message is MessageInterface {
  return (message as MessageInterface)._id !== undefined;
}

function isNewMessageInterface(
  message: MessageInterface | NewMessageInterface
): message is NewMessageInterface {
  return (message as NewMessageInterface).senderName !== undefined;
}

const refactorMessages = (
  messages: (MessageInterface | NewMessageInterface)[]
) => {
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
  }, [] as Array<{ timeStamp?: string } | (MessageInterface | NewMessageInterface)>);
};

const refactorMessagesWithSenderName = (
  messages: MessageInterface[],
  user?: UserInterface
) => {
  return messages.reduce((acc, curr, index, arr) => {
    const isLastMessage = index + 1 >= arr.length;

    if (curr.sender._id === user?._id) {
      // Current user message, no senderName needed
      acc.push(curr);
    } else if (
      !isLastMessage &&
      curr.sender._id === arr[index + 1].sender._id
    ) {
      // Same sender as next message, no senderName needed
      acc.push(curr);
    } else {
      // Add senderName for the last message in a group
      const senderName = curr.sender.fullname;
      acc.push({ ...curr, senderName });
    }

    return acc;
  }, [] as Array<MessageInterface | NewMessageInterface>);
};

const ChatArea: React.FC<Props> = ({
  chat,
  setShowSideBar,
  message,
  setMessage,
  messages,
  loadingMessages,
  isTyping,
  handleMessageChange,
  sendMessage,
  disabled,
  sending,
}) => {
  //import socket hook
  const { user } = useAuth();

  //get receiver chat user profile info
  const profileUser = chat.participants.find(
    (participant) => participant._id !== user?._id
  );

  //To handle auto scroll
  const bottomRef = useRef<HTMLDivElement | null>(null);

  //To show chat side bar while in mobile
  const breakPoint = useBreakpoint();
  const handleOpen = () => {
    if (breakPoint === "mobile") setShowSideBar(true);
  };

  useEffect(() => {
    // Scroll to the bottom when the component mounts or new message is sent ot received or someOne is typing
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

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
            {[
              //refactor messages with timestamps and destructure into new array
              ...refactorMessages(
                //refactor messages with senderName
                refactorMessagesWithSenderName(messages, user || undefined)
              ),
            ]
              //reverse the array to show the current message at the bottom
              .reverse()
              //map the array to show message
              .map((message, index) => {
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
                          {isNewMessageInterface(message) && (
                            <div
                              className="text-secondary ms-1"
                              style={{ fontSize: ".7rem" }}
                            >
                              ~ {message.senderName || ""}
                            </div>
                          )}
                          <Card.Body className="p-1 d-flex flex-column">
                            <div className="message-text">
                              {message.content}
                            </div>
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
            <>
              {isTyping ? (
                <Row className="mb-2 message-container receiver">
                  <Col className="d-flex justify-content-start">
                    <Card className="message-bubble typing-bubble bg-dark">
                      <Card.Body className="p-1 d-flex flex-column">
                        <div className="message-text text-light">Typing...</div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              ) : null}
            </>
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
            onChange={handleMessageChange}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === "Enter" && e.shiftKey) {
                e.preventDefault();
                setMessage((prevValue) => prevValue + "\n");
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
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
          disabled={disabled}
          onClick={sendMessage}
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
