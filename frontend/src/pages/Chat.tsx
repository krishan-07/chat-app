import { Button, Offcanvas, Stack } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import React, { useState } from "react";
import { FaRegEdit } from "react-icons/fa";
import { GiHamburgerMenu } from "react-icons/gi";
import { BsChatText } from "react-icons/bs";
import { IoClose, IoSettingsSharp } from "react-icons/io5";
import CreateChatModal from "../components/CreateChatModal";

type MenuSideBarProps = {
  show: boolean;
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
};
type ChatSideBarProps = MenuSideBarProps & {
  showMenu: React.Dispatch<React.SetStateAction<boolean>>;
  showCreateChat: React.Dispatch<React.SetStateAction<boolean>>;
};

const ChatSideBar: React.FC<ChatSideBarProps> = ({
  show,
  setShow,
  showMenu,
  showCreateChat,
}) => {
  return (
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
      <Offcanvas.Body>
        Some text as placeholder. In real life you can have the elements you
        have chosen. Like, text, images, lists, etc.
      </Offcanvas.Body>
    </Offcanvas>
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

  const handleClose = () => {};

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      <ChatSideBar
        show={showChatSideBar}
        setShow={setShowChatSideBar}
        showMenu={setShowMenu}
        showCreateChat={setShowcreateChat}
      />
      <MenuSideBar show={showMenu} setShow={setShowMenu} />
      <CreateChatModal show={ShowCreateChat} setShow={setShowcreateChat} />

      <div className="d-flex">
        <div className="holder"></div>
        <div className="chat-holder flex-grow-1 px-sm-2">
          <div className="center h2 mt-5" style={{ height: "80%" }}>
            <div className="typewriter-text">Welcome to Chat App</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatPage;
