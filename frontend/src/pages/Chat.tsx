import { Button, Offcanvas, Stack } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import React, { useEffect, useState } from "react";
import { FaRegEdit } from "react-icons/fa";
import { GiHamburgerMenu } from "react-icons/gi";
import { BsChatText } from "react-icons/bs";
import { IoClose, IoSettingsSharp } from "react-icons/io5";
import CreateChatModal from "../components/CreateChatModal";
import { LocalStorage, requestHandler } from "../utils";
import { getAllChats } from "../api";
import ChatName from "../components/ChatName";

type MenuSideBarProps = {
  show: boolean;
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
};
type ChatSideBarProps = MenuSideBarProps & {
  showMenu: React.Dispatch<React.SetStateAction<boolean>>;
  showCreateChat: React.Dispatch<React.SetStateAction<boolean>>;
  chats: ChatInterface[];
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

const ChatSideBar: React.FC<ChatSideBarProps> = ({
  show,
  setShow,
  showMenu,
  showCreateChat,
  chats,
}) => {
  return (
    <>
      <Offcanvas
        className="chat-sidebar"
        show={show}
        style={{
          backgroundColor: "rgb(26 29 32)",
          transition: "none",
          color: "white",
          zIndex: "100",
          borderRight: "none",
          width: "450px",
        }}
        backdrop={false}
        scroll={true}
      >
        <Offcanvas.Header
          className="justify-content-between"
          style={{ backgroundColor: "rgb(15 16 18)" }}
        >
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
            <ChatName
              src={chat.icon}
              name={chat.name}
              chatId={chat._id}
              lastUpdated={chat.updatedAt}
              lastMessage={chat.lastMessage}
              key={chat._id}
            />
          ))}
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

const MenuSideBar: React.FC<MenuSideBarProps> = ({ show, setShow }) => {
  return (
    <Offcanvas
      className="menu-sideBar mx-0"
      show={show}
      onHide={() => setShow(false)}
      style={{
        backgroundColor: "rgb(15 16 18)",
        color: "white",
        width: "65px",
      }}
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
  const [showChatSideBar, setShowChatSideBar] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [ShowCreateChat, setShowcreateChat] = useState(false);
  const [chats, setChats] = useState<ChatInterface[]>(
    () => LocalStorage.get("chats") || []
  );

  const handleClose = () => {};

  const handleLogout = async () => {
    await logout();
  };

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
  return (
    <>
      <ChatSideBar
        show={showChatSideBar}
        setShow={setShowChatSideBar}
        showMenu={setShowMenu}
        showCreateChat={setShowcreateChat}
        chats={chats}
      />
      <MenuSideBar show={showMenu} setShow={setShowMenu} />
      <CreateChatModal show={ShowCreateChat} setShow={setShowcreateChat} />
      <div className="d-flex">
        <div className="holder"></div>
        <div className="chat-holder flex-grow-1 px-sm-2">
          <div className="center h2 mt-5" style={{ height: "80%" }}>
            <div className="typewriter-text">Welcome to Chat App</div>
          </div>
          <Button onClick={handleLogout}>Logout </Button>
        </div>
      </div>
    </>
  );
};

export default ChatPage;
