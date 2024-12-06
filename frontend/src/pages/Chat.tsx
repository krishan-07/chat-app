import { Button, Offcanvas, Stack } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import React, { useEffect, useRef, useState } from "react";
import { FaRegEdit } from "react-icons/fa";
import { GiHamburgerMenu } from "react-icons/gi";
import { BsChatText } from "react-icons/bs";
import { IoClose, IoSettingsSharp } from "react-icons/io5";
import CreateChatModal from "../components/CreateChatModal";
import { LocalStorage, requestHandler } from "../utils";
import { getAllChats } from "../api";
import ChatName from "../components/ChatName";
import ChatArea from "../components/ChatArea";
import { ChatInterface } from "../interface/chat";
import useBreakpoint from "../hooks/useBreakpoint";

type MenuSideBarProps = {
  show: boolean;
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
};

type ChatSideBarProps = MenuSideBarProps & {
  showMenu: React.Dispatch<React.SetStateAction<boolean>>;
  showCreateChat: React.Dispatch<React.SetStateAction<boolean>>;
  chats: ChatInterface[];
  setCurrentChatRef: React.Dispatch<React.SetStateAction<ChatInterface | null>>;
};

const ChatSideBar: React.FC<ChatSideBarProps> = ({
  show,
  setShow,
  showMenu,
  showCreateChat,
  chats,
  setCurrentChatRef,
}) => {
  const currentChat = useRef<ChatInterface | null>(null);
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
                currentChat.current = chat;
                handleClose();
              }}
            >
              <ChatName
                chat={chat}
                isCurrentChat={currentChat.current?._id === chat._id}
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

  const breakPoint = useBreakpoint();

  const [currentChatRef, setCurrentChatRef] = useState<ChatInterface | null>(
    null
  ); //To hold the current chat reference
  const [showChatSideBar, setShowChatSideBar] = useState(true); //To control the chat side bar
  const [showMenu, setShowMenu] = useState(false); //To control the menu
  const [ShowCreateChat, setShowcreateChat] = useState(false); //To control create chat modal

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
        response = res.data;
      },
      alert
    );

    return response;
  };

  //To fetch chats from LocalStorage or API(if localStorage is null) for each time create chat modal is opened
  useEffect(() => {
    const fetchChats = async () => {
      if (!LocalStorage.get("chats")) {
        const fetchedChats = await getChats();
        LocalStorage.set("chats", fetchedChats);
        setChats(fetchedChats);
      } else {
        const chat = LocalStorage.get("chats");
        LocalStorage.set("chats", chat);
        setChats(chat);
      }
    };

    fetchChats();
  }, [ShowCreateChat]);

  //To toggle chat side bar according to breakpoints
  useEffect(() => {
    if (breakPoint !== "mobile") setShowChatSideBar(true);
    if (breakPoint === "mobile" && currentChatRef?._id)
      setShowChatSideBar(false);
    if (breakPoint === "mobile" && !currentChatRef?._id)
      setShowChatSideBar(true);
  }, [breakPoint]);

  return (
    <>
      <ChatSideBar
        show={showChatSideBar}
        setShow={setShowChatSideBar}
        showMenu={setShowMenu}
        showCreateChat={setShowcreateChat}
        chats={chats}
        setCurrentChatRef={setCurrentChatRef}
      />
      <MenuSideBar show={showMenu} setShow={setShowMenu} />
      <CreateChatModal show={ShowCreateChat} setShow={setShowcreateChat} />
      <div className="d-flex">
        <div className="holder" />
        <div className="chat-holder flex-grow-1">
          {currentChatRef?._id ? (
            <ChatArea
              chat={currentChatRef}
              setShowSideBar={setShowChatSideBar}
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
