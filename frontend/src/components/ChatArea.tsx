import {
  Alert,
  Button,
  Card,
  Col,
  Container,
  Form,
  Offcanvas,
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
import {
  MdModeEditOutline,
  MdOutlineEmojiEmotions,
  MdOutlineFileDownload,
} from "react-icons/md";
import { ImAttachment } from "react-icons/im";
import { formatDate, formatParticipants, requestHandler } from "../utils";
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
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { AiOutlineDelete } from "react-icons/ai";
import { Crop } from "react-image-crop";
import ImageCropModal from "./CropImage/ImageCropModal";
import Select from "react-select";
import { CustomOption, customStyles } from "./CreateChat/CustomOption";
import { MultiValue, SingleValue } from "react-select";
import { getAvailableUsers } from "../api";
import { useErrorContext } from "../context/ErrorContext";

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
  hold: boolean;
  setHold: React.Dispatch<React.SetStateAction<boolean>>;
  holdedMessages: MessageInterface[];
  setHoldedMessages: React.Dispatch<React.SetStateAction<MessageInterface[]>>;
  deleteMessages: () => void;
  addParticipant: (participantId: string) => Promise<void>;
  removeParticipant: (participantId: string) => Promise<void>;
  leaveChat: (chatId: string) => Promise<void>;
  deleteGroupChat: (chatId: string) => Promise<void>;
  updateGroup: (chatId: string, name: string, icon: string) => Promise<void>;
  deleteSingleChat: (chatId: string) => Promise<void>;
}

interface UserOption {
  value: string; // Corresponds to `user._id`
  label: string; // Corresponds to `user.username`
  avatar: string; // URL for the user's avatar
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
  hold,
  setHold,
  holdedMessages,
  setHoldedMessages,
  deleteMessages,
  addParticipant,
  removeParticipant,
  leaveChat,
  deleteGroupChat,
  updateGroup,
  deleteSingleChat,
}) => {
  //import socket hook
  const { user } = useAuth();
  const { addError } = useErrorContext();

  //To show chat side bar while in mobile
  const breakPoint = useBreakpoint();
  const handleOpen = () => {
    if (breakPoint === "mobile") setShowSideBar(true);
  };

  const profileUser = chat.participants.find(
    (participant) => participant._id !== user?._id
  ); //get receiver chat user profile info

  //To store the reference of the element from where the attachments overlay should be shown
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); //To hold input ref for changing user avatar
  const bottomRef = useRef<HTMLDivElement | null>(null); //To handle auto scroll
  const holdTimer = useRef<NodeJS.Timeout | null>(null); //To store the hold timer

  const [imgSrc, setImgSrc] = useState(""); //To hold the uploaded avatar
  const [crop, setCrop] = useState<Crop>(); //To hold cropped uploaded avatar
  const [showImageCropper, setShowImageCropper] = useState(false); //To control the image cropper modal
  const [groupName, setGroupName] = useState(""); //To set group name

  const [showChatDetails, setShowChatDetails] = useState(false); //To toggle chat details
  const [showOverlay, setShowOverlay] = useState(false); //To toggle attachments overlay visibility
  const [showEmoji, setShowEmoji] = useState(false); //To toggle emoji picker visibility
  const [showAddParicipant, setShowAddPartipant] = useState(false);
  const [newParticipant, setNewParticipant] = useState<UserOption | null>(null);
  const [options, setOptions] = useState<UserOption[]>([]);

  const fileRefs = useRef<{ [key: string]: HTMLInputElement | null }>({
    docs: null,
    images: null,
    videos: null,
  }); //To contain the refs for file input elements
  const [files, setFiles] = useState<File[]>([]); //To store the file for making edits
  const [filesArrayType, setFilesArrayType] = useState<string>(); //To store the file array type

  const handleChatDetailsClose = () => {
    setShowChatDetails(false);
    setShowAddPartipant(false);
    setImgSrc("");
  };

  //To handle the avatar updation
  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      setCrop(undefined);
      if (!file.type.startsWith("image/")) {
        alert("Only image files are allowed!");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setImgSrc(reader.result?.toString() || "");
      reader.readAsDataURL(file);

      setShowImageCropper(true);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleStart = (message: MessageInterface) => {
    // If message hold state is active, update the holded message on touch/mouse start
    if (hold) {
      // Check if the holded messages don't contain the selected message
      holdedMessages.every((m) => m._id !== message._id) &&
      // Check if the selected message is sent by the current user
      message.sender._id === user?._id
        ? // If yes, add the selected message to the holded messages
          setHoldedMessages((prev) => [...prev, message])
        : // If no, remove the selected message from the holded messages
          setHoldedMessages(
            holdedMessages.filter((m) => m._id !== message._id)
          );
    } else if (message.sender._id === user?._id) {
      // Enable hold messages
      holdTimer.current = setTimeout(() => {
        setHold(true); // Enable the hold state
        setHoldedMessages([message]); // Set the current message as the holded message
      }, 1000); // 1-second hold
    }
  };

  const handleEnd = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current); // Clear the timer
      holdTimer.current = null; // Reset the reference
    }
    if (!holdedMessages.length) setHold(false);
  };

  // Bind both mouse and touch events
  const bindInteractionEvents = (message: MessageInterface) => ({
    onMouseDown: () => handleStart(message),
    onTouchStart: () => handleStart(message),
    onMouseUp: handleEnd,
    onTouchEnd: handleEnd,
    onMouseLeave: handleEnd, // Fallback for mouse leaving the element
    onTouchCancel: handleEnd, // Handle touch interruptions
  });

  //To handle attachments change
  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files); // Convert FileList to an array
      setFiles(fileArray); // Update the local file state
      setFilesArrayType(fileArray[0].type); //update the type of file array
      setAttachedFiles(fileArray); //update main attachments
    }
  };

  const fetchUsers = async () => {
    await requestHandler(
      async () => await getAvailableUsers(),
      undefined,
      (res) => {
        if (res.data.length) {
          const data: UserOption[] = res.data.map((user: UserInterface) => ({
            value: user._id,
            label: user.username,
            avatar: user.avatar,
          }));

          setOptions(
            data.filter((d) =>
              chat.participants.every((par) => par._id !== d.value)
            )
          );
        }
      },
      addError
    );
  };

  useEffect(() => {
    // Scroll to the bottom when the component mounts or new message is sent ot received or someOne is typing
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, files]);

  useEffect(() => {
    //close the overlay when the breakpoint changes
    setShowOverlay(false);
  }, [breakPoint]);

  useEffect(() => {
    fetchUsers();
  }, [showAddParicipant]);

  useEffect(() => {
    fetchUsers();
    setGroupName(chat.name);
  }, [chat]);

  return (
    <div
      className="d-flex flex-column"
      style={{ height: "100%", width: "100%" }}
    >
      {/* chat details section */}
      {chat.isGroupChat ? (
        //group details
        <Offcanvas
          className="profile-section"
          show={showChatDetails}
          backdrop={false}
          scroll={true}
          onHide={handleChatDetailsClose}
        >
          <Offcanvas.Header className="justify-content-between profile-section-header">
            <Offcanvas.Title>Group details</Offcanvas.Title>
            <div>
              <IoClose
                size={30}
                className="cursor-pointer"
                onClick={handleChatDetailsClose}
              />
            </div>
          </Offcanvas.Header>
          <Offcanvas.Body>
            <div className="d-flex flex-column gap-1 h-100">
              <Row className="justify-content-center">
                <div className="center mb-3">
                  <div className="my-1">
                    <ProfileImage
                      src={imgSrc ? imgSrc : chat?.icon}
                      alt="profile-image"
                      size="120px"
                    />
                  </div>
                  {chat.admin === user?._id && (
                    <div className="align-self-end">
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="file"
                        accept="image/*"
                        className="d-none"
                        onChange={handleIconChange}
                      />
                      <label
                        htmlFor="file"
                        style={{
                          bottom: "10px",
                          right: "10px",
                          position: "relative",
                        }}
                        className="cursor-pointer"
                      >
                        <MdModeEditOutline size={27} />
                        <ImageCropModal
                          show={showImageCropper}
                          handleClose={() => setShowImageCropper(false)}
                          imgSrc={imgSrc}
                          setImgSrc={setImgSrc}
                          crop={crop}
                          setCrop={setCrop}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </Row>
              <div
                className="flex-grow-1 d-flex flex-column"
                style={{ overflowY: "auto" }}
              >
                <Form.Group controlId="user-fullname">
                  <Form.Label style={{ fontWeight: "500" }}>Name</Form.Label>
                  <Form.Control
                    type="input"
                    value={groupName}
                    disabled={chat.admin !== user?._id}
                    onChange={(e) => setGroupName(e.target.value)}
                    size="sm"
                  />
                </Form.Group>
                <div
                  className="flex-grow-1 d-flex flex-column mt-2"
                  style={{ overflowY: "auto" }}
                >
                  <div
                    className="mb-1 py-1 d-flex justify-content-between align-items-center"
                    style={{ fontWeight: "500" }}
                  >
                    <div>Participants</div>
                    {chat.admin === user?._id && (
                      <div
                        className="cursor-pointer"
                        onClick={() => {
                          setShowAddPartipant((s) => !s);
                          setNewParticipant(null);
                        }}
                      >
                        {showAddParicipant ? "Close" : "+ Add"}
                      </div>
                    )}
                  </div>
                  {showAddParicipant && (
                    <div className="mb-2">
                      <Select<UserOption, false | true>
                        isMulti={false}
                        options={options}
                        value={newParticipant}
                        onChange={(
                          newValue:
                            | MultiValue<UserOption>
                            | SingleValue<UserOption>
                        ) => {
                          setNewParticipant(
                            newValue as SingleValue<UserOption>
                          );
                        }}
                        placeholder="Search users..."
                        components={{ Option: CustomOption }}
                        styles={customStyles}
                        isSearchable={true}
                        noOptionsMessage={() => "No users found"}
                      />
                    </div>
                  )}
                  <div className="flex-grow-1" style={{ overflowY: "auto" }}>
                    {chat.participants.map((participant) => (
                      <div
                        className="d-flex p-1"
                        key={participant._id}
                        style={{ fontSize: ".9rem" }}
                      >
                        <ProfileImage
                          src={participant.avatar}
                          size="30px"
                          alt={participant.username}
                        />

                        <div className="ms-1 flex-grow-1">
                          {participant.fullname}
                        </div>

                        {chat.admin === participant._id && (
                          <div className="text-primary cursor-default">
                            admin
                          </div>
                        )}
                        {participant._id !== chat.admin &&
                          chat.admin === user?._id && (
                            <div
                              className="text-danger cursor-pointer"
                              onClick={() => {
                                removeParticipant(participant._id);
                              }}
                            >
                              remove
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <Stack
                gap={2}
                direction="horizontal"
                className="justify-content-end"
              >
                <Button
                  variant="secondary"
                  onClick={handleChatDetailsClose}
                  size="sm"
                >
                  Close
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (chat.admin === user?._id) deleteGroupChat(chat._id);
                    else leaveChat(chat._id);
                  }}
                  size="sm"
                >
                  {chat.admin === user?._id ? "Delete" : "Leave"}
                </Button>
                {(imgSrc.trim() || groupName.trim() !== chat.name) && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      updateGroup(chat._id, groupName, imgSrc);
                      setImgSrc("");
                    }}
                  >
                    Save
                  </Button>
                )}
                {showAddParicipant && (
                  <Button
                    variant="success"
                    size="sm"
                    disabled={!newParticipant}
                    onClick={() => {
                      if (newParticipant) addParticipant(newParticipant.value);
                      setNewParticipant(null);
                    }}
                  >
                    Add
                  </Button>
                )}
              </Stack>
            </div>
          </Offcanvas.Body>
        </Offcanvas>
      ) : (
        //chat details
        <Offcanvas
          className="profile-section"
          show={showChatDetails}
          scroll={false}
          backdrop={false}
          onHide={() => setShowChatDetails(false)}
        >
          <Offcanvas.Header className="justify-content-between profile-section-header">
            <Offcanvas.Title>
              {profileUser?.fullname + "'s profile"}
            </Offcanvas.Title>
            <div>
              <IoClose
                size={30}
                className="cursor-pointer"
                onClick={() => setShowChatDetails(false)}
              />
            </div>
          </Offcanvas.Header>
          <Offcanvas.Body className="d-flex flex-column">
            <Stack gap={1} className="flex-grow-1">
              <Row className="justify-content-center">
                <div className="center mb-3">
                  <div className="my-1">
                    <ProfileImage
                      src={profileUser?.avatar}
                      alt="profile-image"
                      size="150px"
                    />
                  </div>
                </div>
              </Row>
              <Form.Group controlId="user-fullname">
                <Form.Label>Fullname</Form.Label>
                <Form.Control
                  type="input"
                  value={profileUser?.fullname}
                  disabled
                />
              </Form.Group>
              <Form.Group controlId="username">
                <Form.Label>Username</Form.Label>
                <Form.Control
                  type="input"
                  value={profileUser?.username}
                  disabled
                ></Form.Control>
              </Form.Group>
              <Form.Group controlId="email">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="input"
                  value={profileUser?.email}
                  disabled
                ></Form.Control>
              </Form.Group>
            </Stack>
            <Stack
              gap={2}
              direction="horizontal"
              className="justify-content-end mb-1"
            >
              <Button
                variant="secondary"
                onClick={() => setShowChatDetails(false)}
              >
                Close
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteSingleChat(chat._id)}
              >
                Leave
              </Button>
            </Stack>
          </Offcanvas.Body>
        </Offcanvas>
      )}

      {/* Header Section */}
      <div className="chat-header">
        <div className="d-flex align-items-center justify-content-between py-2 px-3">
          <div
            className="d-flex align-items-center"
            style={{ cursor: "default" }}
          >
            {/* back button */}
            {breakPoint === "mobile" && (
              <div
                className="px-2 cursor-pointer back-arrow"
                onClick={handleOpen}
              >
                <IoIosArrowBack size={30} />
              </div>
            )}
            {/* profile card */}
            <div
              className="d-flex align-items-center"
              onClick={() => setShowChatDetails((s) => !s)}
            >
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
                  {chat.isGroupChat ? (
                    <div className="">
                      {formatParticipants(
                        chat.participants.map(
                          (participant) => participant.fullname
                        ),
                        breakPoint === "mobile"
                          ? 20
                          : breakPoint === "tablet"
                          ? 50
                          : 100
                      )}
                    </div>
                  ) : (
                    <>select for contact info</>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* delete button */}
          {hold && (
            <div className="d-flex align-items-center">
              <div
                className="position-relative cursor-pointer"
                onClick={deleteMessages}
              >
                <span
                  style={{
                    fontSize: ".8rem",
                  }}
                  className="position-absolute center center-absolute"
                >
                  {holdedMessages.length}
                </span>
                <span className="text-danger" style={{ fontSize: ".8rem" }}>
                  <AiOutlineDelete size={30} />
                </span>
              </div>
              <div
                className="cursor-pointer"
                onClick={() => {
                  setHold(false);
                  setHoldedMessages([]);
                }}
              >
                <IoClose size={25} />
              </div>
            </div>
          )}
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
                  <div key={file.name} className="w-100">
                    <div className="d-flex p-2 align-items-center">
                      <div className="center">
                        <video
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
                      <div
                        className="flex-grow-1 px-2 text-truncate"
                        style={{ width: 100 }}
                      >
                        {file.name}
                      </div>
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
                          message.sender._id === user!._id
                            ? "sender"
                            : "receiver"
                        } ${holdedMessages.includes(message) && "holded"}`}
                        {...bindInteractionEvents(message)}
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
                                          style={{ width: "134px" }}
                                        >
                                          {att.url.split("/").pop()}
                                        </div>
                                        {message.sender._id !== user?._id && (
                                          <div className="flex-shrink-1 px-1">
                                            <Alert.Link
                                              href={downloadLink}
                                              download={att.url
                                                .split("/")
                                                .pop()}
                                              className="p-1 download-btn"
                                            >
                                              <MdOutlineFileDownload
                                                size={25}
                                              />
                                            </Alert.Link>
                                          </div>
                                        )}
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
                                      {message.sender._id !== user?._id && (
                                        <div className="position-absolute center center-absolute">
                                          <Alert.Link
                                            href={downloadLink}
                                            download={att.url.split("/").pop()}
                                            className="p-1 download-btn"
                                          >
                                            <MdOutlineFileDownload size={25} />
                                          </Alert.Link>
                                        </div>
                                      )}
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
                                      {message.sender._id !== user?._id && (
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
                                      )}
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
                                {!message.content.includes("deleted") &&
                                  formatDate(message.createdAt)}
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
                  <Row className="mb-2 message-container receiver mt-2">
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
      <div className="chat-typing d-flex align-items-center position-relative">
        {/* emoji picker */}
        {showEmoji && (
          <div
            className="position-absolute"
            style={{ top: "-435px", left: "8px" }}
          >
            <Picker
              data={data}
              onEmojiSelect={(e: { native: string }) => {
                setMessage((prev) => prev + e.native);
              }}
              perLine={8}
              emojiSize={24}
              theme="dark"
              previewPosition="none"
              onClickOutside={() => setShowEmoji(false)}
            />
          </div>
        )}
        <div
          className="cursor-pointer p-2 center message-icons"
          onClick={(e) => {
            e.stopPropagation(); //prevents the button click from propagating to the onClickOutside handler.
            setShowEmoji((prev) => !prev);
          }}
        >
          <MdOutlineEmojiEmotions size={25} />
        </div>

        {/* attachments */}
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

        {/* text area */}
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

        {/* send button */}
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
