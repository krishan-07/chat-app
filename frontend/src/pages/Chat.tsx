import { Button, Offcanvas, Stack } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import React, { useEffect, useRef, useState } from "react";
import { FaRegEdit } from "react-icons/fa";
import { GiHamburgerMenu } from "react-icons/gi";
import { BsChatText } from "react-icons/bs";
import { IoClose, IoSettingsSharp } from "react-icons/io5";
import CreateChatModal from "../components/CreateChat/CreateChatModal";
import { LocalStorage, requestHandler } from "../utils";
import { getAllChats, getChatMessages, sendMessage } from "../api";
import ChatName from "../components/ChatName";
import ChatArea from "../components/ChatArea";
import { ChatInterface } from "../interface/chat";
import useBreakpoint from "../hooks/useBreakpoint";
import { useSocket } from "../context/SocketContext";
import { ChatEventEnum } from "../utils/constants";
import { MessageInterface } from "../interface/message";

const ChatPage = () => {
  const { logout } = useAuth();
  const { socket } = useSocket();

  const breakPoint = useBreakpoint();

  const currentChatRef = useRef<ChatInterface | null>(null); //To hold the current chat reference

  const [showChatSideBar, setShowChatSideBar] = useState(true); //To control the chat side bar
  const [showMenu, setShowMenu] = useState(false); //To control the menu
  const [ShowCreateChat, setShowcreateChat] = useState(false); //To control create chat modal
  const [unreadMessages, setUnreadMessages] = useState<MessageInterface[]>([]); // To track unread messages

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
        console.log(data);

        setChats(data || []);
      },
      alert
    );

    return response;
  };

  const getMessages = async () => {
    // Check if socket is available, if not, show an alert
    if (!socket) return alert("Socket not available");

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
      alert
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
      alert
    );
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

  const onMessageReceived = (message: MessageInterface) => {
    //check if the message received belongs to current chat_id
    // If it belongs to the current chat, update the messages list for the active chat
    if (message.chat === currentChatRef.current?._id)
      setMessages((prev) => [message, ...prev]);
    // If it belongs to the current chat, update the messages list for the active chat
    else setUnreadMessages((prev) => [message, ...prev]);

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

  useEffect(() => {
    if (!socket) return;

    socket.on(ChatEventEnum.CONNECTED_EVENT, onConnect);
    socket.on(ChatEventEnum.DISCONNECT_EVENT, OnDisconnect);
    socket.on(ChatEventEnum.NEW_CHAT_EVENT, onNewChat);
    socket.on(ChatEventEnum.MESSAGE_RECEIVED_EVENT, onMessageReceived);
    socket.on(ChatEventEnum.TYPING_EVENT, handleOnSocketTyping);
    socket.on(ChatEventEnum.STOP_TYPING_EVENT, handleOnSocketStopTyping);

    return () => {
      socket.off(ChatEventEnum.CONNECTED_EVENT, onConnect);
      socket.off(ChatEventEnum.DISCONNECT_EVENT, OnDisconnect);
      socket.off(ChatEventEnum.NEW_CHAT_EVENT, onNewChat);
      socket.off(ChatEventEnum.MESSAGE_RECEIVED_EVENT, onMessageReceived);
      socket.off(ChatEventEnum.TYPING_EVENT, handleOnSocketTyping);
      socket.off(ChatEventEnum.STOP_TYPING_EVENT, handleOnSocketStopTyping);
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
      {/* chat side bar */}
      <Offcanvas
        className="chat-sidebar"
        show={showChatSideBar}
        backdrop={false}
        scroll={true}
      >
        <Offcanvas.Header className="justify-content-between chat-sidebar-header">
          <Offcanvas.Title>Chat App</Offcanvas.Title>
          <Stack gap={3} direction="horizontal">
            <GiHamburgerMenu
              size={30}
              className="cursor-pointer"
              onClick={() => setShowMenu((s) => !s)}
            />
            <FaRegEdit
              size={28}
              className="cursor-pointer"
              onClick={() => setShowcreateChat(true)}
            />
          </Stack>
        </Offcanvas.Header>
        <hr className="mt-0" />
        <Offcanvas.Body className="p-0">
          {chats.map((chat) => (
            <div
              key={chat._id}
              onClick={() => {
                //set the current chat
                LocalStorage.set("current-chat", chat);
                currentChatRef.current = chat;
                console.log(chat);

                getMessages();

                //set unread messages to read
                setUnreadMessages(
                  unreadMessages.filter(
                    (m) => m.chat !== currentChatRef.current?._id
                  )
                );

                //toggle show chat side bar when in mobile
                if (breakPoint === "mobile") setShowChatSideBar(false);
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
        <Offcanvas.Header>
          <IoClose
            size={35}
            className="cursor-pointer"
            onClick={() => setShowMenu(false)}
          />
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex justify-content-between align-items-center flex-column">
          <BsChatText size={28} className="cursor-pointer" />
          <IoSettingsSharp size={28} className="cursor-pointer" />
        </Offcanvas.Body>
      </Offcanvas>

      {/* create chat modal */}
      <CreateChatModal
        show={ShowCreateChat}
        setShow={setShowcreateChat}
        onSucess={(chat) => {
          setChats([chat, ...chats]);
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
