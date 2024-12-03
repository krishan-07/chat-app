import React, { useState } from "react";
import { Button, Form, Modal, Stack } from "react-bootstrap";
import { IoClose } from "react-icons/io5";
import { getUserByQuery } from "../api";
import { UserInterface } from "../interface/user";
import AsyncSelect from "react-select/async";
import { CustomOption, customStyles } from "./CustomOption";
import { MultiValue, SingleValue } from "react-select";
import { requestHandler } from "../utils";
import {
  createSingleChat as singleChat,
  createGroupChat as groupChat,
} from "../api";

interface Props {
  show: boolean;
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
}

interface UserOption {
  value: string; // Corresponds to `user._id`
  label: string; // Corresponds to `user.username`
  avatar: string; // URL for the user's avatar
}

const createSingleChat = async (user: UserOption[]) => {
  let response;

  await requestHandler(
    async () => await singleChat(user[0].value),
    undefined,
    (res) => (response = res.data),
    alert
  );

  return response;
};

const createGroupChat = async (users: UserOption[]) => {
  const groupName = users.reduce((acc, user) => acc + user.label + ", ", "");
  const participants = users.map((user) => user.value);

  let response;

  await requestHandler(
    async () => await groupChat(groupName.trim(), participants),
    undefined,
    (res) => (response = res.data),
    alert
  );

  return response;
};

const fetchUsers = async (query: string): Promise<UserOption[]> => {
  if (!query) return [];

  let data: UserOption[] | [] = [];

  await requestHandler(
    async () => await getUserByQuery(query),
    undefined,
    (res) => {
      if (res.data.length) {
        data = res.data.map((user: UserInterface) => ({
          value: user._id,
          label: user.username,
          avatar: user.avatar,
        }));
      }
    },
    alert
  );

  return data;
};

const CreateChatModal: React.FC<Props> = ({ show, setShow }) => {
  const [selectedUsers, setSelectedUsers] = useState<UserOption[] | null>(null);
  const [isMulti, setIsMulti] = useState<boolean>(false);

  const handleChange = (
    newValue: SingleValue<UserOption> | MultiValue<UserOption> | null
  ) => {
    if (isMulti) {
      // Multi-select: newValue is readonly UserOption[], convert to mutable array
      setSelectedUsers(Array.isArray(newValue) ? [...newValue] : []);
    } else {
      // Single-select: newValue is SingleValue<UserOption> (single object or null)
      setSelectedUsers(newValue ? [newValue as UserOption] : null);
    }
  };

  const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsMulti(e.target.checked);
  };

  const handleClose = () => {
    setSelectedUsers(null);
    setShow(false);
  };

  const handleSubmit = async () => {
    if (!selectedUsers || !selectedUsers.length) {
      alert("Please select user to create a chat");
      return;
    }

    if (!isMulti) {
      await createSingleChat(selectedUsers);
      return;
    }
    await createGroupChat(selectedUsers);

    setShow(false);
  };

  return (
    <Modal show={show} onHide={() => setShow(false)}>
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
          checked={isMulti}
          onChange={handleToggleChange}
        ></Form.Check>
        <div className="mb-5" style={{ height: "200px" }}>
          <AsyncSelect<UserOption, false | true>
            loadOptions={fetchUsers}
            value={selectedUsers}
            onChange={handleChange}
            placeholder="Search users..."
            components={{ Option: CustomOption }}
            styles={customStyles}
            isMulti={isMulti}
          />
        </div>
        <Stack direction="horizontal" gap={1}>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {isMulti ? "Create Group chat" : "Create Chat"}
          </Button>
        </Stack>
      </Modal.Body>
    </Modal>
  );
};

export default CreateChatModal;
