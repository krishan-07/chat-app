import { Button, Offcanvas, Stack } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import React, { useEffect, useState } from "react";
import { FaRegEdit } from "react-icons/fa";
import { GiHamburgerMenu } from "react-icons/gi";
import { BsChatText } from "react-icons/bs";
import { IoClose, IoSettingsSharp } from "react-icons/io5";
import CreateChatModal from "../components/CreateChat/CreateChatModal";
import { LocalStorage, requestHandler } from "../utils";
import { getAllChats } from "../api";
import ChatName from "../components/ChatName";
import ChatArea from "../components/ChatArea";
import { ChatInterface } from "../interface/chat";
import useBreakpoint from "../hooks/useBreakpoint";
import { useSocket } from "../context/SocketContext";
import { ChatEventEnum } from "../utils/constants";
import { MessageInterface } from "../interface/message";

type MenuSideBarProps = {
  show: boolean;
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
};

type ChatSideBarProps = MenuSideBarProps & {
  showMenu: React.Dispatch<React.SetStateAction<boolean>>;
  showCreateChat: React.Dispatch<React.SetStateAction<boolean>>;
  chats: ChatInterface[];
  setCurrentChatRef: React.Dispatch<React.SetStateAction<ChatInterface | null>>;
  currentChatRef: ChatInterface | null;
  unreadMessages: MessageInterface[];
  setUnreadMessages: React.Dispatch<React.SetStateAction<MessageInterface[]>>;
};

const ChatSideBar: React.FC<ChatSideBarProps> = ({
  show,
  setShow,
  showMenu,
  showCreateChat,
  chats,
  setCurrentChatRef,
  currentChatRef,
  unreadMessages,
  setUnreadMessages,
}) => {
  const breakPoint = useBreakpoint();

  const handleClose = () => {
    if (breakPoint === "mobile") setShow(false);
  };
  return (
    <>
      <Offcanvas
        className="chat-sidebar"
        show={show}
        backdrop={false}
        scroll={true}
      >
        <Offcanvas.Header className="justify-content-between chat-sidebar-header">
          <Offcanvas.Title>Chat App</Offcanvas.Title>
          <Stack gap={3} direction="horizontal">
            <GiHamburgerMenu
              size={30}
              className="cursor-pointer"
              onClick={() => showMenu((s) => !s)}
            />
            <FaRegEdit
              size={28}
              className="cursor-pointer"
              onClick={() => showCreateChat(true)}
            />
          </Stack>
        </Offcanvas.Header>
        <hr className="mt-0" />
        <Offcanvas.Body className="p-0">
          {chats.map((chat) => (
            <div
              key={chat._id}
              onClick={() => {
                setCurrentChatRef(chat);
                LocalStorage.set("current-chat", chat);
                handleClose();
                setUnreadMessages([
                  ...unreadMessages.filter(
                    (m) => m.chat === currentChatRef?._id
                  ),
                ]);
              }}
            >
              <ChatName
                chat={chat}
                isActive={currentChatRef?._id === chat._id}
                unreadMessages={
                  unreadMessages.filter((m) => m.chat === chat._id).length
                }
              />
            </div>
          ))}
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

const MenuSideBar: React.FC<MenuSideBarProps> = ({ show, setShow }) => {
  return (
    <Offcanvas
      className="menu-sidebar mx-0"
      show={show}
      onHide={() => setShow(false)}
      scroll={false}
    >
      <Offcanvas.Header>
        <IoClose
          size={35}
          className="cursor-pointer"
          onClick={() => setShow(false)}
        />
      </Offcanvas.Header>
      <Offcanvas.Body className="d-flex justify-content-between align-items-center flex-column">
        <BsChatText size={28} className="cursor-pointer" />
        <IoSettingsSharp size={28} className="cursor-pointer" />
      </Offcanvas.Body>
    </Offcanvas>
  );
};

const ChatPage = () => {
  const { logout } = useAuth();
  const { socket } = useSocket();

  const breakPoint = useBreakpoint();

  const [currentChatRef, setCurrentChatRef] = useState<ChatInterface | null>(
    null
  ); //To hold the current chat reference
  const [showChatSideBar, setShowChatSideBar] = useState(true); //To control the chat side bar
  const [showMenu, setShowMenu] = useState(false); //To control the menu
  const [ShowCreateChat, setShowcreateChat] = useState(false); //To control create chat modal
  const [unreadMessages, setUnreadMessages] = useState<MessageInterface[]>([]); // To track unread messages

  //To store chats, by default retrive it from Local storage
  const [chats, setChats] = useState<ChatInterface[]>(
    () => LocalStorage.get("chats") || []
  );

  const handleLogout = async () => {
    await logout();
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
      alert
    );

    return response;
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

  const onNewChat = (chat: ChatInterface) => {
    setChats((prev) => [chat, ...prev]);
  };

  useEffect(() => {
    // Fetch the chat list from the server.
    getChats();

    // Retrieve the current chat details from local storage.
    const _currentChat = LocalStorage.get("current-chat");

    // If there's a current chat saved in local storage:
    if (_currentChat) {
      // Set the current chat reference to the one from local storage.
      setCurrentChatRef(_currentChat);
      // If the socket connection exists, emit an event to join the specific chat using its ID.
      socket?.emit(ChatEventEnum.JOIN_CHAT_EVENT, _currentChat._id);
    }
  }, []);

  //To toggle chat side bar according to breakpoints
  useEffect(() => {
    if (breakPoint !== "mobile") setShowChatSideBar(true);
    if (breakPoint === "mobile" && currentChatRef?._id)
      setShowChatSideBar(false);
    if (breakPoint === "mobile" && !currentChatRef?._id)
      setShowChatSideBar(true);
  }, [breakPoint]);

  useEffect(() => {
    if (!socket) return;

    socket.on(ChatEventEnum.NEW_CHAT_EVENT, onNewChat);

    return () => {
      socket.off(ChatEventEnum.NEW_CHAT_EVENT, onNewChat);
    };
  }, [chats, socket]);
  return (
    <>
      <ChatSideBar
        show={showChatSideBar}
        setShow={setShowChatSideBar}
        showMenu={setShowMenu}
        showCreateChat={setShowcreateChat}
        chats={chats}
        setCurrentChatRef={setCurrentChatRef}
        currentChatRef={currentChatRef}
        unreadMessages={unreadMessages}
        setUnreadMessages={setUnreadMessages}
      />
      <MenuSideBar show={showMenu} setShow={setShowMenu} />
      <CreateChatModal
        show={ShowCreateChat}
        setShow={setShowcreateChat}
        onSucess={(chat) => {
          setChats([chat, ...chats]);
        }}
      />
      <div className="d-flex">
        <div className="holder" />
        <div className="chat-holder flex-grow-1">
          {currentChatRef?._id ? (
            <ChatArea
              chat={currentChatRef}
              setShowSideBar={setShowChatSideBar}
              setChats={setChats}
              setUnreadMessages={setUnreadMessages}
              updateChatLastMessage={(
                chatId: string,
                message: MessageInterface
              ) => {
                updateChatLastMessage(chatId, message);
              }}
            />
          ) : (
            <>
              <div className="center h2 mt-5" style={{ height: "80%" }}>
                <div className="typewriter-text">Welcome to Chat App</div>
              </div>
              <div className="center">
                <Button onClick={handleLogout}>Logout </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ChatPage;
