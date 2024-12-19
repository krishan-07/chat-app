import React, { useEffect, useState } from "react";
import { Button, Form, Modal, Spinner, Stack } from "react-bootstrap";
import { IoClose } from "react-icons/io5";
import { getAvailableUsers } from "../../api";
import { UserInterface } from "../../interface/user";
import Select from "react-select";
import { CustomOption, customStyles } from "./CustomOption";
import { MultiValue, SingleValue } from "react-select";
import { requestHandler } from "../../utils";
import {
  createSingleChat as singleChat,
  createGroupChat as groupChat,
} from "../../api";
import { ChatInterface } from "../../interface/chat";
import { useErrorContext } from "../../context/ErrorContext";

interface Props {
  show: boolean;
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
  onSucess: (chat: ChatInterface) => void;
}

interface UserOption {
  value: string; // Corresponds to `user._id`
  label: string; // Corresponds to `user.username`
  avatar: string; // URL for the user's avatar
}

const CreateChatModal: React.FC<Props> = ({ show, setShow, onSucess }) => {
  const { addError } = useErrorContext();

  const [selectedUsers, setSelectedUsers] = useState<UserOption[] | null>(null);
  const [isGroupChat, setIsGroupChat] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [groupChatName, setGroupChatName] = useState("");
  const [options, setOptions] = useState<UserOption[]>([]);

  const handleChange = (
    newValue: SingleValue<UserOption> | MultiValue<UserOption> | null
  ) => {
    if (isGroupChat) {
      // Multi-select: newValue is readonly UserOption[], convert to mutable array
      setSelectedUsers(Array.isArray(newValue) ? [...newValue] : []);
    } else {
      // Single-select: newValue is SingleValue<UserOption> (single object or null)
      setSelectedUsers(newValue ? [newValue as UserOption] : null);
    }
  };

  const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsGroupChat(e.target.checked);
  };

  const handleClose = () => {
    setGroupChatName("");
    setIsGroupChat(false);
    setSelectedUsers(null);
    setShow(false);
  };

  const createSingleChat = async () => {
    if (!selectedUsers) return alert("Please select a user");

    await requestHandler(
      async () => await singleChat(selectedUsers[0].value || ""),
      setIsLoading,
      (res) => {
        const { data } = res;
        if (res.statuscode === 200) {
          addError("Chat with selected user already exists");
          handleClose();
          return;
        }
        onSucess(data);
        handleClose(); // Close the modal or popup
      },
      addError
    );
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
          setOptions(data);
        }
      },
      addError
    );
  };

  useEffect(() => {
    if (!show) return;

    fetchUsers();
  }, [show]);

  const createGroupChat = async () => {
    if (!selectedUsers) return alert("Please select a user");
    if (!groupChatName.trim()) return alert("Please enter a group name");
    if (groupChatName.length < 3)
      return alert("Group name should have more than 3 characters");

    const participants = selectedUsers.map((user) => user.value);
    if (participants.length <= 1)
      return alert(
        "Please select more than one participant to create groupChat"
      );

    await requestHandler(
      async () => await groupChat(groupChatName.trim(), participants),
      setIsLoading,
      (res) => {
        const { data } = res;
        onSucess(data);
        handleClose();
      },
      addError
    );
  };

  return (
    <Modal show={show} onHide={() => setShow(false)} centered>
      <Modal.Header className="justify-content-between">
        <Modal.Title>Create Chat</Modal.Title>
        <IoClose size={28} className="cursor-pointer" onClick={handleClose} />
      </Modal.Header>
      <Modal.Body>
        <Form.Check
          className="mb-3"
          type="switch"
          id="group-chat-switch"
          label="Is it a group chat?"
          checked={isGroupChat}
          onChange={handleToggleChange}
        ></Form.Check>

        <Form.Control
          type="text"
          value={groupChatName}
          onChange={(e) => setGroupChatName(e.target.value)}
          placeholder="Enter a group name..."
          className={`typing-input custom-placeholder fs-6 border-secondary border-radius-10 ${
            !isGroupChat ? "hidden" : "visible"
          }`}
          style={{ border: "1px solid lightgray" }}
        ></Form.Control>

        <div className="mb-5" style={{ height: "200px" }}>
          <Select<UserOption, false | true>
            options={options}
            value={selectedUsers}
            onChange={handleChange}
            placeholder="Search users..."
            components={{ Option: CustomOption }}
            styles={customStyles}
            isMulti={isGroupChat}
            isSearchable={true}
            noOptionsMessage={() => "No users found"}
          />
        </div>
        <Stack direction="horizontal" gap={1}>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button
            variant="primary"
            disabled={isLoading}
            onClick={() => {
              isGroupChat ? createGroupChat() : createSingleChat();
            }}
          >
            {isLoading ? (
              <Spinner size="sm" animation="border" role="status"></Spinner>
            ) : (
              "create"
            )}
          </Button>
        </Stack>
      </Modal.Body>
    </Modal>
  );
};

export default CreateChatModal;
