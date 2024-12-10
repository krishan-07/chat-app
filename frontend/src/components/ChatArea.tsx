import {
  Alert,
  Button,
  Card,
  Col,
  Container,
  Form,
  Overlay,
  Popover,
  Row,
  Spinner,
  Stack,
} from "react-bootstrap";
import { ChatInterface } from "../interface/chat";
import ProfileImage from "./ProfileImage";
import React, { useEffect, useRef, useState } from "react";
import { IoClose, IoSendOutline } from "react-icons/io5";
import { MdOutlineEmojiEmotions, MdOutlineFileDownload } from "react-icons/md";
import { ImAttachment } from "react-icons/im";
import { formatDate } from "../utils";
import { MessageInterface } from "../interface/message";
import useBreakpoint from "../hooks/useBreakpoint";
import { IoIosArrowBack } from "react-icons/io";
import { useAuth } from "../context/AuthContext";
import TextareaAutosize from "react-textarea-autosize";
import { UserInterface } from "../interface/user";
import { CiFileOn, CiImageOn } from "react-icons/ci";
import {
  BsFiletypeDoc,
  BsFiletypeDocx,
  BsFiletypePdf,
  BsFiletypeXls,
  BsFiletypeXlsx,
} from "react-icons/bs";
import { PiFileVideo } from "react-icons/pi";

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
  setAttachedFiles: React.Dispatch<React.SetStateAction<File[]>>;
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

const getFileIcon = (type: string) => {
  if (type.includes(".doc")) {
    return <BsFiletypeDoc size={25} />;
  } else if (type.includes(".docx")) {
    return <BsFiletypeDocx size={25} />;
  } else if (type.includes("pdf")) {
    return <BsFiletypePdf size={25} />;
  } else if (type.includes(".xls")) {
    return <BsFiletypeXls size={25} />;
  } else if (type.includes(".xlsx")) {
    return <BsFiletypeXlsx size={25} />;
  } else {
    return "🗂️";
  }
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
  setAttachedFiles,
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

  const overlayRef = useRef<HTMLDivElement>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  const fileRefs = useRef<{ [key: string]: HTMLInputElement | null }>({
    docs: null,
    images: null,
    videos: null,
  }); //To contain the refs for file input elements
  const [files, setFiles] = useState<File[]>([]); //To store the file for making edits
  const [filesArrayType, setFilesArrayType] = useState<string>(); //To store the file array type

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files); // Convert FileList to an array
      setFiles(fileArray); // Update the local file state
      setFilesArrayType(fileArray[0].type); //update the type of file array
      setAttachedFiles(fileArray); //update main attachments
    }
  };

  useEffect(() => {
    // Scroll to the bottom when the component mounts or new message is sent ot received or someOne is typing
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    //close the overlay when the breakpoint changes
    setShowOverlay(false);
  }, [breakPoint]);

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
      {files.length ? (
        //show attachments if files are uploaded
        <div className="bg-dark flex-grow-1 p-1" style={{ overflowY: "auto" }}>
          {
            //check if the file array type is of image
            filesArrayType?.startsWith("image/")
              ? files.map((file) => (
                  <div key={file.name}>
                    <div className="d-flex p-2 align-items-center">
                      <div
                        className="center"
                        style={{
                          aspectRatio: "1:1",
                        }}
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          height={30}
                          style={{
                            objectFit: "contain",
                          }}
                        />
                      </div>
                      <div className="flex-grow-1 px-2">{file.name}</div>
                      <div
                        className="cursor-pointer"
                        onClick={() => {
                          setFiles(files.filter((f) => f.name !== file.name));
                          setAttachedFiles(files);
                        }}
                      >
                        <IoClose size={20} />
                      </div>
                    </div>
                    <hr className="m-0 mb-1" />
                  </div>
                ))
              : //check if the file type is of video
              filesArrayType?.startsWith("video/")
              ? files.map((file) => (
                  <div key={file.name}>
                    <div className="d-flex p-2 align-items-center">
                      <div className="center">
                        <video
                          style={{
                            aspectRatio: "1:1",
                          }}
                          src={URL.createObjectURL(file)}
                          height="80px"
                          width="150px"
                          controls
                          autoPlay={false}
                          muted
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                      <div className="flex-grow-1 px-2">{file.name}</div>
                      <div
                        className="cursor-pointer"
                        onClick={() => {
                          setFiles(files.filter((f) => f.name !== file.name));
                          setAttachedFiles(files);
                        }}
                      >
                        <IoClose size={20} />
                      </div>
                    </div>
                    <hr className="m-0 mb-1" />
                  </div>
                ))
              : //render files of types docx, pdf, etc...
                files.map((file) => (
                  <div key={file.name}>
                    <div className="d-flex p-2 align-items-center">
                      <div>{getFileIcon(file.type)}</div>
                      <div className="flex-grow-1 px-2">{file.name}</div>
                      <div
                        className="cursor-pointer"
                        onClick={() => {
                          setFiles(files.filter((f) => f.name !== file.name));
                          setAttachedFiles(files);
                        }}
                      >
                        <IoClose size={20} />
                      </div>
                    </div>
                    <hr className="m-0 mb-1" />
                  </div>
                ))
          }
        </div>
      ) : (
        //show messages
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
                          user?._id === message.sender._id
                            ? "sender"
                            : "receiver"
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
                            {
                              //show sender's name if it is group chat
                              isNewMessageInterface(message) &&
                                chat.isGroupChat && (
                                  <div
                                    className="text-secondary ms-1"
                                    style={{ fontSize: ".7rem" }}
                                  >
                                    ~ {message.senderName || ""}
                                  </div>
                                )
                            }
                            <Card.Body className="p-1 d-flex flex-column">
                              {message.attachments?.map((att) => {
                                const url = att.url.split("/upload/");
                                const downloadLink = `${url[0]}/upload/fl_attachment/${url[1]}`;
                                //render attachments which are of file type...
                                if (
                                  /\.(docx|pdf|xls|xlsx|pptx|txt|csv)$/i.test(
                                    att.url
                                  )
                                )
                                  return (
                                    <div
                                      key={att.url}
                                      className="mb-1 position-relative attachment-container"
                                    >
                                      <div className="d-flex align-items-center">
                                        <div>{getFileIcon(att.url)}</div>
                                        <div
                                          className="flex-shrink-1 text-wrap px-1"
                                          style={{ width: "130px" }}
                                        >
                                          {att.url.split("/").pop()}
                                        </div>
                                        <div className="flex-shrink-1 px-1">
                                          <Alert.Link
                                            href={downloadLink}
                                            download={att.url.split("/").pop()}
                                            className="p-1 download-btn"
                                          >
                                            <MdOutlineFileDownload size={25} />
                                          </Alert.Link>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                //render attachments of image type
                                else if (att.type.includes("image"))
                                  return (
                                    <div
                                      key={att.url}
                                      className="mb-1 position-relative attachment-container"
                                    >
                                      <img
                                        src={att.url}
                                        alt={att.type}
                                        style={{
                                          objectFit: "contain",
                                        }}
                                      />
                                      <div className="position-absolute center center-absolute">
                                        <Alert.Link
                                          href={downloadLink}
                                          download={att.url.split("/").pop()}
                                          className="p-1 download-btn"
                                        >
                                          <MdOutlineFileDownload size={25} />
                                        </Alert.Link>
                                      </div>
                                    </div>
                                  );
                                else
                                  return (
                                    <div
                                      key={att.url}
                                      className="mb-1 position-relative attachment-container"
                                    >
                                      <video
                                        src={att.url}
                                        controls
                                        muted
                                        autoPlay={false}
                                        width={200}
                                        height={120}
                                      />
                                      <div
                                        className="position-absolute center"
                                        style={{
                                          top: "5px",
                                          right: "2px",
                                          zIndex: "1",
                                        }}
                                      >
                                        <Alert.Link
                                          href={downloadLink}
                                          download={att.url.split("/").pop()}
                                          className="p-1 download-btn"
                                        >
                                          <MdOutlineFileDownload size={25} />
                                        </Alert.Link>
                                      </div>
                                    </div>
                                  );
                              })}
                              <div
                                className="message-text"
                                style={
                                  message.attachments && { maxWidth: "200px" }
                                }
                              >
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
                          <div className="message-text text-light">
                            Typing...
                          </div>
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
      )}

      {/* Typing section */}
      <div className="chat-typing d-flex align-items-center">
        <div className="cursor-pointer p-2 center message-icons">
          <MdOutlineEmojiEmotions size={25} />
        </div>
        <div
          className="cursor-pointer p-2 center message-icons"
          onClick={() => setShowOverlay(!showOverlay)}
          ref={overlayRef}
        >
          <ImAttachment size={21} />
        </div>
        <Overlay
          target={overlayRef.current}
          placement="top"
          show={showOverlay}
          onHide={() => setShowOverlay(false)}
          rootClose
        >
          <Popover id="popover-basic" className="bg-popover p-2">
            <Popover.Body className="text-light p-0">
              <Stack gap={1} className="px-1">
                <Form.Group controlId="file-control">
                  <Form.Label className="cursor-pointer">
                    <CiFileOn size={25} />
                    <Form.Text className="text-light ps-2">Files</Form.Text>
                  </Form.Label>
                  <Form.Control
                    ref={(e: HTMLInputElement) => (fileRefs.current.docs = e)}
                    type="file"
                    accept=".pdf, .doc, .docx, .xls"
                    className="d-none"
                    onChange={handleFilesChange}
                    multiple
                  ></Form.Control>
                </Form.Group>
                <Form.Group controlId="image-control">
                  <Form.Label className="cursor-pointer">
                    <CiImageOn size={25} />
                    <Form.Text className="text-light ps-2">Images</Form.Text>
                  </Form.Label>
                  <Form.Control
                    ref={(e: HTMLInputElement) => (fileRefs.current.images = e)}
                    type="file"
                    accept="image/*"
                    className="d-none"
                    onChange={handleFilesChange}
                    multiple
                  ></Form.Control>
                </Form.Group>
                <Form.Group controlId="video-control">
                  <Form.Label className="cursor-pointer">
                    <PiFileVideo size={25} />
                    <Form.Text className="text-light ps-2">Videos</Form.Text>
                  </Form.Label>
                  <Form.Control
                    ref={(e: HTMLInputElement) => (fileRefs.current.videos = e)}
                    type="file"
                    accept="video/mp4"
                    onChange={handleFilesChange}
                    className="d-none"
                    multiple
                  ></Form.Control>
                </Form.Group>
              </Stack>
            </Popover.Body>
          </Popover>
        </Overlay>

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
          onClick={() => {
            sendMessage();
            setFiles([]);
          }}
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
