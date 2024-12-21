import {
  Button,
  Container,
  Form,
  Offcanvas,
  Row,
  Spinner,
  Stack,
} from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import React, { useEffect, useRef, useState } from "react";
import { FaRegEdit } from "react-icons/fa";
import { GiHamburgerMenu } from "react-icons/gi";
import { BsChatText } from "react-icons/bs";
import { IoClose, IoSettingsSharp } from "react-icons/io5";
import CreateChatModal from "../components/CreateChat/CreateChatModal";
import { blobUrlToFile, LocalStorage, requestHandler } from "../utils";
import {
  addParticipant,
  deleteChat,
  deleteGroup,
  deleteMessage,
  getAllChats,
  getChatMessages,
  leaveGroup,
  removeParticipant,
  sendMessage,
  updateAvatar,
  updateGroup,
  updateUserDetails,
} from "../api";
import ChatName from "../components/ChatName";
import ChatArea from "../components/ChatArea";
import { ChatInterface } from "../interface/chat";
import useBreakpoint from "../hooks/useBreakpoint";
import { useSocket } from "../context/SocketContext";
import { ChatEventEnum } from "../utils/constants";
import { MessageInterface } from "../interface/message";
import { TypeAnimation } from "react-type-animation";
import { BiLogOut } from "react-icons/bi";
import ProfileImage from "../components/ProfileImage";
import { MdModeEditOutline } from "react-icons/md";
import { Crop } from "react-image-crop";
import ImageCropModal from "../components/CropImage/ImageCropModal";
import { UserInterface } from "../interface/user";
import { IoIosArrowBack } from "react-icons/io";
import { useErrorContext } from "../context/ErrorContext";
import { useAlertContext } from "../context/AlertContext";
import ConfirmationModal from "../components/ConfirmationModal";
import useConfirmationModal from "../hooks/useConfirmationModal";
import { useNotification } from "../context/NotificationContext";

const ChatPage = () => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const { addError } = useErrorContext();
  const { showAlert } = useAlertContext();
  const {
    isModalVisible,
    modalOptions,
    showConfirmationModal,
    hideConfirmationModal,
  } = useConfirmationModal();
  const { showNotification } = useNotification();

  //To use some func based on different website breakpoints
  const breakPoint = useBreakpoint();

  const [currentUser, setCurrentUser] = useState<UserInterface | null>(
    LocalStorage.get("user") || user
  ); //To hold the current user

  const currentChatRef = useRef<ChatInterface | null>(null); //To hold the current chat reference

  const [showChatSideBar, setShowChatSideBar] = useState(true); //To control the chat side bar
  const [showMenu, setShowMenu] = useState(false); //To control the menu
  const [showCreateChat, setshowCreateChat] = useState(false); //To control create chat modal
  const [unreadMessages, setUnreadMessages] = useState<MessageInterface[]>([]); // To track unread messages
  const [showUserProfile, setShowUserProfile] = useState(false); //To control User profile side bar
  const [userFullname, setUserFullname] = useState(currentUser?.fullname || ""); //To update the fullname

  const fileInputRef = useRef<HTMLInputElement>(null); //To hold input ref for changing user avatar

  const [imgSrc, setImgSrc] = useState(""); //To hold the uploaded avatar
  const [crop, setCrop] = useState<Crop>(); //To hold cropped uploaded avatar
  const [showImageCropper, setShowImageCropper] = useState(false); //To control the image cropper modal
  const [isUserProfileUpdating, setIsUserProfileUpdating] = useState(false); //To show loading state when user data is updating

  //To store chats, by default retrive it from Local storage
  const [chats, setChats] = useState<ChatInterface[]>([]);

  const [message, setMessage] = useState(""); //To store the currently typed message
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]); // To store files attached to messages

  const [messages, setMessages] = useState<MessageInterface[]>([]); //To store the message
  const [loadingMessages, setLoadingMessages] = useState(false); //To indicate loading of messages
  const [sending, setSending] = useState(false); //To indicate message is sending

  const [isConnected, setIsConnected] = useState(false); // For tracking socket connection

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null); //To keep track of setTimeoutFunction

  const [isTyping, setIsTyping] = useState(false); // To track if someone is currently typing
  const [selfTyping, setSelfTyping] = useState(false); // To track if the current user is typing

  const [hold, setHold] = useState(false); // Track whether the messages are holded state is active
  const [holdedMessages, setHoldedMessages] = useState<MessageInterface[]>([]);
  //To store holded messages

  const handleUserProfileClose = () => {
    setShowUserProfile(false); //close the user profile offcanvas
    setImgSrc(""); //remove updated avatar
  };

  const handleLogout = async () => {
    await logout();
  };

  //To handle the avatar updation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      setCrop(undefined);
      if (!file.type.startsWith("image/")) {
        addError("Only image files are allowed!");
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

  const updateUserData = async () => {
    setIsUserProfileUpdating(true);
    //if only avatar is updated send api req to update avatar
    if (imgSrc) {
      showAlert("Updating profile image...");
      await requestHandler(
        async () => await updateAvatar(await blobUrlToFile(imgSrc)),
        undefined,
        (res) => {
          setCurrentUser(res.data);
          LocalStorage.set("user", res.data);
        },
        addError
      );
      showAlert("Profile image updated.", "success", 300);
    }
    //if only fullname is updated send api req to update userDetails
    if (userFullname !== currentUser?.fullname) {
      showAlert("Updating profile name...");

      await requestHandler(
        async () => await updateUserDetails(userFullname, ""),
        undefined,
        (res) => {
          setCurrentUser(res.data);
          LocalStorage.set("user", res.data);
        },
        addError
      );

      showAlert("Profile name updated.", "success", 300);
    }

    setIsUserProfileUpdating(false);
    setImgSrc("");
  };

  const getChats = async () => {
    let response: ChatInterface[] = [];

    await requestHandler(
      async () => await getAllChats(),
      undefined,
      (res) => {
        const { data } = res;

        setChats(data || []);
      },
      addError
    );

    return response;
  };

  const getMessages = async () => {
    // Check if socket is available, if not, show an addError
    if (!socket) return addError("Socket not available");

    if (currentChatRef.current)
      // Emit an event to join the current chat
      socket.emit(ChatEventEnum.JOIN_CHAT_EVENT, currentChatRef.current._id);

    // Make an async request to fetch chat messages for the current chat
    requestHandler(
      // Fetching messages for the current chat
      async () => await getChatMessages(currentChatRef.current?._id || ""),
      // Set the state to loading while fetching the messages
      setLoadingMessages,
      // After fetching, set the chat messages to the state if available
      (res) => {
        const { data } = res;
        setMessages(data || []);
      },
      // Display any error alerts if they occur during the fetch
      addError
    );
  };

  const updateChatLastMessage = (chatId: string, message: MessageInterface) => {
    //search for chat from which the message is belonged
    const chatToUpdate = chats.find((chat) => chat._id === chatId);

    if (chatToUpdate) {
      chatToUpdate.lastMessage = message; //update chat last message
      chatToUpdate.updatedAt = message.updatedAt; //update chat updated at field

      setChats([chatToUpdate, ...chats.filter((chat) => chat._id !== chatId)]);
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    if (!socket || !isConnected) return;

    if (!selfTyping) {
      setSelfTyping(true);

      socket.emit(
        ChatEventEnum.TYPING_EVENT,
        currentChatRef.current?._id || ""
      );
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const timeout = 2000;

    // Set a timeout to stop the typing indication after the timerLength has passed
    typingTimeoutRef.current = setTimeout(() => {
      // Emit a stop typing event to the server for the current chat
      socket.emit(
        ChatEventEnum.STOP_TYPING_EVENT,
        currentChatRef.current?._id || ""
      );

      // Reset the user's typing state
      setSelfTyping(false);
    }, timeout);
  };

  const sendChatMessage = async () => {
    if (!socket) return; //if there is no socket connection return

    if (!message.trim() && !attachedFiles.length) return;

    // Emit a STOP_TYPING_EVENT to inform other users/participants that typing has stopped
    socket.emit(
      ChatEventEnum.STOP_TYPING_EVENT,
      currentChatRef.current?._id || ""
    );

    await requestHandler(
      async () =>
        await sendMessage(
          currentChatRef.current?._id || "",
          message,
          attachedFiles
        ),
      setSending,
      (res) => {
        setMessage(""); // Clear the message input
        setAttachedFiles([]); // Clear the list of attached files
        setMessages((prev) => [res.data, ...prev]); // Update messages in the UI
        updateChatLastMessage(currentChatRef.current?._id || "", res.data);
      },
      addError
    );
  };

  const deleteChatMessage = () => {
    // Show the confirmation modal
    showConfirmationModal({
      title: holdedMessages.length > 1 ? "Delete Messages" : "Delete Message",
      message:
        holdedMessages.length > 1
          ? "Are you sure you want to delete these Messages?"
          : "Are you sure you want to delete this Message?",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        // Close the modal
        hideConfirmationModal();

        // Perform deletion
        setHold(false);
        for (const message of holdedMessages) {
          await requestHandler(
            async () => await deleteMessage(message.chat, message._id),
            undefined,
            () => {},
            addError
          );
        }
        setHoldedMessages([]); // Clear the selected messages
      },
    });
  };

  const updateLastMessageOnDeletion = (
    chatId: string,
    message: MessageInterface
  ) => {
    const chatToUpdate = chats.find((chat) => chat._id == chatId);

    if (chatToUpdate?.lastMessage?._id === message._id) {
      chatToUpdate.lastMessage = message;
      setChats((prev) =>
        prev.map((chat) =>
          chat._id === chatToUpdate?._id ? chatToUpdate : chat
        )
      );
    }
  };

  const addParticipantInTheGroup = async (newParticipantId: string) => {
    requestHandler(
      async () =>
        await addParticipant(currentChatRef.current!._id, newParticipantId),
      undefined,
      (res) => {
        const { data } = res;
        currentChatRef.current = data;
        LocalStorage.set("current-chat", data);
        setChats((prev) =>
          prev.map((p) => (p._id === data._id ? { ...data } : p))
        );
      },
      addError
    );
  };

  const removeParticipantFromGroup = async (participantId: string) => {
    showConfirmationModal({
      title: "Remove Participant?",
      message:
        "Are you sure you want to remove this participant from the group?",
      confirmText: "Remove",
      cancelText: "Cancel",
      onConfirm: async () => {
        hideConfirmationModal(); // Hide the modal before performing the action

        await requestHandler(
          async () =>
            await removeParticipant(currentChatRef.current!._id, participantId),
          undefined,
          (res) => {
            const { data } = res;
            currentChatRef.current = data;
            LocalStorage.set("current-chat", data);
            setChats((prev) =>
              prev.map((p) => (p._id === data._id ? { ...data } : p))
            );
          },
          addError
        );
      },
    });
  };

  const leaveGroupChat = async (chatId: string) => {
    showConfirmationModal({
      title: "Leave Group?",
      message: "Do you really want to leave the group?",
      confirmText: "Leave",
      cancelText: "Cancel",
      onConfirm: async () => {
        hideConfirmationModal(); // Hide the modal first

        // Perform the leave group action
        await requestHandler(
          async () => await leaveGroup(chatId),
          undefined,
          () => {}, // Optional success callback
          addError
        );
      },
    });
  };

  const deleteGroupChat = async (chatId: string) => {
    showConfirmationModal({
      title: "Delete Group?",
      message:
        "Are you sure you want to delete this group? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        hideConfirmationModal(); // Hide the modal before performing the action

        await requestHandler(
          async () => await deleteGroup(chatId),
          undefined,
          () => {}, // Optional success callback
          addError
        );
      },
    });
  };

  const updateGroupChat = async (
    chatId: string,
    groupName: string,
    groupIcon: string
  ) => {
    let icon: File;
    if (groupIcon.trim()) icon = await blobUrlToFile(groupIcon);
    showAlert("updating group chat...");
    await requestHandler(
      async () => await updateGroup(chatId, groupName, icon),
      undefined,
      (res) => {
        if (res.data._id === currentChatRef.current?._id) {
          currentChatRef.current = res.data;
          LocalStorage.set("current-chat", res.data);
        }
        setChats((prev) =>
          prev.map((p) => (p._id === res.data._id ? { ...res.data } : p))
        );
      },
      addError
    );
    showAlert("group chat updated successfully.", "success", 3000);
  };

  const deleteSingleChat = async (chatId: string) => {
    showConfirmationModal({
      title: "Delete Chat?",
      message:
        "Are you sure you want to delete this chat? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        hideConfirmationModal(); // Hide the modal before performing the action

        await requestHandler(
          async () => await deleteChat(chatId),
          undefined,
          () => {
            if (breakPoint === "mobile") setShowChatSideBar(true);
          },
          addError
        );
      },
    });
  };

  const onConnect = () => {
    setIsConnected(true);
  };

  const OnDisconnect = () => {
    setIsConnected(false);
  };

  const onNewChat = (chat: ChatInterface) => {
    setChats((prev) => [chat, ...prev]);
  };

  const onLeaveChat = (chat: ChatInterface) => {
    if (chat._id === currentChatRef.current?._id) {
      currentChatRef.current = null;
      LocalStorage.remove("current-chat");
    }
    setChats((prev) => prev.filter((p) => p._id !== chat._id));
  };

  const onMessageReceived = (message: MessageInterface) => {
    //check if the message received belongs to current chat_id
    // If it belongs to the current chat, update the messages list for the active chat
    if (message.chat === currentChatRef.current?._id)
      setMessages((prev) => [message, ...prev]);
    // If it belongs to the current chat, update the messages list for the active chat
    else setUnreadMessages((prev) => [message, ...prev]);

    const newMessage = {
      id: message._id,
      sender: message.sender.fullname,
      text: message.content || "🔗 attachement",
    };
    showNotification(newMessage);

    updateChatLastMessage(message.chat || "", message);
  };

  const handleOnSocketTyping = (chatId: string) => {
    // Check if the typing event is for the currently active chat.
    if (chatId !== currentChatRef.current?._id) return;

    // Set the typing state to true for the current chat.
    setIsTyping(true);
  };

  const handleOnSocketStopTyping = (chatId: string) => {
    // Check if the stop typing event is for the currently active chat.
    if (chatId !== currentChatRef.current?._id) return;

    // Set the typing state to false for the current chat.
    setIsTyping(false);
  };

  const onMessageDelete = (newMessage: MessageInterface) => {
    if (newMessage.chat !== currentChatRef.current?._id) {
      setUnreadMessages((prevUnreadMessages) =>
        prevUnreadMessages.filter((msg) => msg._id !== newMessage._id)
      );
    } else {
      setMessages((prevMessages) =>
        prevMessages.map((oldMessage) =>
          oldMessage._id === newMessage._id ? { ...newMessage } : oldMessage
        )
      );
    }
    updateLastMessageOnDeletion(newMessage.chat, newMessage);
  };

  const onParticipantLeft = (chat: ChatInterface) => {
    if (chat._id === currentChatRef.current?._id) {
      currentChatRef.current = chat;
      LocalStorage.set("current-chat", chat);
    }
    setChats((prev) => prev.map((p) => (chat._id === p._id ? { ...chat } : p)));
  };

  const onParticipantJoinded = (chat: ChatInterface) => {
    if (chat._id === currentChatRef.current?._id) {
      currentChatRef.current = chat;
      LocalStorage.set("current-chat", chat);
    }
    setChats((prev) => prev.map((p) => (chat._id === p._id ? { ...chat } : p)));
  };

  const onGroupUpdateEvent = (chat: ChatInterface) => {
    if (chat._id === currentChatRef.current?._id) {
      currentChatRef.current = chat;
      LocalStorage.set("current-chat", chat);
    }
    setChats((prev) => prev.map((p) => (p._id === chat._id ? { ...chat } : p)));
  };

  useEffect(() => {
    const requestNotificationPermission = () => {
      if (!("Notification" in window)) {
        console.error("This browser does not support notifications.");
        return;
      }

      Notification.requestPermission();
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js").catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
    } else {
      console.error("Service Workers are not supported in this browser.");
    }

    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on(ChatEventEnum.CONNECTED_EVENT, onConnect);
    socket.on(ChatEventEnum.DISCONNECT_EVENT, OnDisconnect);
    socket.on(ChatEventEnum.NEW_CHAT_EVENT, onNewChat);
    socket.on(ChatEventEnum.MESSAGE_RECEIVED_EVENT, onMessageReceived);
    socket.on(ChatEventEnum.TYPING_EVENT, handleOnSocketTyping);
    socket.on(ChatEventEnum.STOP_TYPING_EVENT, handleOnSocketStopTyping);
    socket.on(ChatEventEnum.MESSAGE_DELETE_EVENT, onMessageDelete);
    socket.on(ChatEventEnum.LEAVE_CHAT_EVENT, onLeaveChat);
    socket.on(ChatEventEnum.PARTICIPANT_JOINED, onParticipantJoinded);
    socket.on(ChatEventEnum.PARTICIPANT_LEFT, onParticipantLeft);
    socket.on(ChatEventEnum.UPDATE_GROUP_EVENT, onGroupUpdateEvent);

    return () => {
      socket.off(ChatEventEnum.CONNECTED_EVENT, onConnect);
      socket.off(ChatEventEnum.DISCONNECT_EVENT, OnDisconnect);
      socket.off(ChatEventEnum.NEW_CHAT_EVENT, onNewChat);
      socket.off(ChatEventEnum.MESSAGE_RECEIVED_EVENT, onMessageReceived);
      socket.off(ChatEventEnum.TYPING_EVENT, handleOnSocketTyping);
      socket.off(ChatEventEnum.STOP_TYPING_EVENT, handleOnSocketStopTyping);
      socket.off(ChatEventEnum.MESSAGE_DELETE_EVENT, onMessageDelete);
      socket.off(ChatEventEnum.LEAVE_CHAT_EVENT, onLeaveChat);
      socket.off(ChatEventEnum.PARTICIPANT_JOINED, onParticipantJoinded);
      socket.off(ChatEventEnum.PARTICIPANT_LEFT, onParticipantLeft);
      socket.off(ChatEventEnum.UPDATE_GROUP_EVENT, onGroupUpdateEvent);
    };
  }, [chats, socket]);

  useEffect(() => {
    // Fetch the chat list from the server.
    getChats();

    // Retrieve the current chat details from local storage.
    const _currentChat = LocalStorage.get("current-chat");

    // If there's a current chat saved in local storage:
    if (_currentChat) {
      // Set the current chat reference to the one from local storage.
      currentChatRef.current = _currentChat;

      //fetch the messages of the current chat
      getMessages();

      // If the socket connection exists, emit an event to join the specific chat using its ID.
      socket?.emit(ChatEventEnum.JOIN_CHAT_EVENT, _currentChat._id);
    }
  }, []);

  //To toggle chat side bar according to breakpoints
  useEffect(() => {
    if (breakPoint !== "mobile") setShowChatSideBar(true);
    if (breakPoint === "mobile" && currentChatRef.current?._id)
      setShowChatSideBar(false);
    if (breakPoint === "mobile" && !currentChatRef.current?._id)
      setShowChatSideBar(true);
  }, [breakPoint]);

  return (
    <>
      <ConfirmationModal
        show={isModalVisible}
        onHide={hideConfirmationModal}
        title={modalOptions?.title || "Are you sure?"}
        message={modalOptions?.message || "Please confirm this action."}
        confirmText={modalOptions?.confirmText || "Confirm"}
        cancelText={modalOptions?.cancelText || "Cancel"}
        onConfirm={modalOptions?.onConfirm || (() => {})}
      />
      {/* chat side bar */}
      <Offcanvas
        className="chat-sidebar"
        show={showChatSideBar}
        backdrop={false}
        scroll={true}
      >
        <Offcanvas.Header className="justify-content-between chat-sidebar-header">
          <Offcanvas.Title className="d-flex">
            {breakPoint === "mobile" && (
              <div
                className="px-2 cursor-pointer back-arrow"
                onClick={() => setShowChatSideBar(false)}
              >
                <IoIosArrowBack size={30} />
              </div>
            )}
            Chat App
          </Offcanvas.Title>
          <Stack gap={3} direction="horizontal">
            <GiHamburgerMenu
              size={30}
              className="cursor-pointer"
              onClick={() => setShowMenu((s) => !s)}
            />
            <FaRegEdit
              size={28}
              className="cursor-pointer"
              onClick={() => setshowCreateChat(true)}
            />
          </Stack>
        </Offcanvas.Header>
        <hr className="mt-0" />
        <Offcanvas.Body className="p-0">
          {!chats.length && (
            <Container className="d-flle">
              <Button
                variant="outline-primary"
                onClick={() => setshowCreateChat(true)}
                className="w-100"
              >
                + NEW CHAT
              </Button>
            </Container>
          )}
          {chats.map((chat) => (
            <div
              key={chat._id}
              onClick={() => {
                //set the current chat
                LocalStorage.set("current-chat", chat);
                currentChatRef.current = chat;

                getMessages();

                //set unread messages to read
                setUnreadMessages(
                  unreadMessages.filter(
                    (m) => m.chat !== currentChatRef.current?._id
                  )
                );

                //toggle show chat side bar when in mobile
                if (breakPoint === "mobile") setShowChatSideBar(false);

                //reset the message holded state and messages
                setHold(false);
                setHoldedMessages([]);
              }}
            >
              <ChatName
                chat={chat}
                isActive={currentChatRef.current?._id === chat._id}
                unreadMessages={
                  unreadMessages.filter((m) => m.chat === chat._id).length
                }
              />
            </div>
          ))}
        </Offcanvas.Body>
      </Offcanvas>

      {/* menu side bar */}
      <Offcanvas
        className="menu-sidebar mx-0"
        show={showMenu}
        onHide={() => setShowMenu(false)}
        scroll={false}
      >
        <Offcanvas.Header className="justify-content-end">
          <IoClose
            size={35}
            className="cursor-pointer"
            onClick={() => setShowMenu(false)}
          />
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex justify-content-between lign-items-center flex-column p-1">
          <div
            className="cursor-pointer ms-1"
            onClick={() => {
              setShowMenu(false);
              if (breakPoint === "mobile") setShowChatSideBar(false);
            }}
          >
            <div className="d-flex">
              <div className="w-30 center">
                <BsChatText size={25} />
              </div>
              <div className="ps-1 flex-grow-1">Chats</div>
            </div>
          </div>
          <div className="d-flex flex-column">
            <div
              className="mb-3 d-flex align-items-center cursor-pointer"
              onClick={() => {
                setShowUserProfile(true);
              }}
            >
              <div className="w-30 center">
                <ProfileImage
                  size="28px"
                  src={currentUser?.avatar}
                  alt="user-profile"
                />
              </div>
              <div className="ps-1 flex-grow-1">Profile</div>
            </div>

            <div className="mb-3 d-flex align-items-center cursor-pointer">
              <div className="w-30 center">
                <IoSettingsSharp size={25} />
              </div>
              <div className="ps-1 flex-grow-1">Settings</div>
            </div>
            <div
              className="mb-3 d-flex align-items-center cursor-pointer"
              onClick={handleLogout}
            >
              <div className="w-30 center">
                <BiLogOut size={28} title="logout" />
              </div>
              <div className="ps-1 flex-grow-1">Logout</div>
            </div>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      {/* profile section */}
      <Offcanvas
        className="profile-section"
        show={showUserProfile}
        backdrop={true}
        scroll={false}
        onHide={handleUserProfileClose}
      >
        <Offcanvas.Header className="justify-content-between profile-section-header">
          <Offcanvas.Title>Profile</Offcanvas.Title>
          <div>
            <IoClose
              size={30}
              className="cursor-pointer"
              onClick={handleUserProfileClose}
            />
          </div>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Stack gap={1}>
            <Row className="justify-content-center">
              <div className="center mb-3">
                <div className="my-1">
                  <ProfileImage
                    src={imgSrc ? imgSrc : currentUser?.avatar}
                    alt="profile-image"
                    size="150px"
                  />
                </div>
                <div className="align-self-end">
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="file"
                    accept="image/*"
                    className="d-none"
                    onChange={handleFileChange}
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
              </div>
            </Row>
            <Form.Group controlId="user-fullname">
              <Form.Label>Fullname</Form.Label>
              <Form.Control
                type="input"
                value={userFullname}
                onChange={(e) => setUserFullname(e.target.value)}
              />
            </Form.Group>
            <Form.Group controlId="username">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="input"
                value={currentUser?.username}
                disabled
              ></Form.Control>
            </Form.Group>
            <Form.Group controlId="email">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="input"
                value={currentUser?.email}
                disabled
              ></Form.Control>
            </Form.Group>
          </Stack>
          <Stack
            gap={2}
            direction="horizontal"
            className="justify-content-end mt-3"
          >
            <Button variant="secondary" onClick={handleUserProfileClose}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={updateUserData}
              disabled={
                !imgSrc.trim() && userFullname.trim() === currentUser?.fullname
              }
            >
              {isUserProfileUpdating ? (
                <Spinner size="sm" animation="border" />
              ) : (
                "Update"
              )}
            </Button>
          </Stack>
        </Offcanvas.Body>
      </Offcanvas>
      {/* create chat modal */}
      <CreateChatModal
        show={showCreateChat}
        setShow={setshowCreateChat}
        onSucess={(chat) => {
          setChats([chat, ...chats]);
          if (breakPoint === "mobile") setShowChatSideBar(true);
        }}
      />

      {/* chat area */}
      <div className="d-flex">
        <div className="holder" />
        <div className="chat-holder flex-grow-1">
          {currentChatRef.current?._id ? (
            <ChatArea
              chat={currentChatRef.current}
              message={message}
              setMessage={setMessage}
              messages={messages}
              loadingMessages={loadingMessages}
              isTyping={isTyping}
              handleMessageChange={handleMessageChange}
              sendMessage={sendChatMessage}
              sending={sending}
              disabled={sending || (!message.trim() && !attachedFiles.length)}
              setShowSideBar={setShowChatSideBar}
              setAttachedFiles={setAttachedFiles}
              hold={hold}
              setHold={setHold}
              holdedMessages={holdedMessages}
              setHoldedMessages={setHoldedMessages}
              deleteMessages={() => {
                deleteChatMessage();
              }}
              addParticipant={(participantId: string) =>
                addParticipantInTheGroup(participantId)
              }
              removeParticipant={(participantId: string) =>
                removeParticipantFromGroup(participantId)
              }
              leaveChat={(chatId: string) => leaveGroupChat(chatId)}
              deleteGroupChat={(chatId: string) => deleteGroupChat(chatId)}
              updateGroup={(chatId: string, name: string, icon: string) =>
                updateGroupChat(chatId, name, icon)
              }
              deleteSingleChat={(chatId: string) => deleteSingleChat(chatId)}
            />
          ) : (
            <Container className="h-100">
              <div className="center h3 px-4 h-100">
                <div className="d-flex flex-column text-center">
                  <TypeAnimation
                    sequence={[
                      "Welcome to Chat App",
                      1000, // wait 1s before replacing "Mice" with "Hamsters"
                      "Start chatting now!",
                      1000,
                    ]}
                    wrapper="span"
                    speed={50}
                    style={{ fontSize: "2em", display: "inline-block" }}
                    repeat={0}
                  />
                  <div className="center mt-3">
                    <Button
                      variant="outline-primary"
                      onClick={() => {
                        setshowCreateChat(true);
                        if (breakPoint === "mobile") setShowChatSideBar(true);
                      }}
                    >
                      + NEW CHAT
                    </Button>
                  </div>
                </div>
              </div>
            </Container>
          )}
        </div>
      </div>
    </>
  );
};

export default ChatPage;
