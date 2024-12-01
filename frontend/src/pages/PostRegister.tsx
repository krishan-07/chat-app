import ProfileImage from "../components/ProfileImage";
import { MdModeEditOutline } from "react-icons/md";
import { useAuth } from "../context/AuthContext";
import React, { useRef, useState } from "react";
import { Container, Form, InputGroup, Row } from "react-bootstrap";

function PostRegister() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imgSrc, setImgSrc] = useState("");
  const [fullname, setFullname] = useState(user?.fullname);

  const handleFileChange = () => {};

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFullname(e.target.value);
  };

  return (
    <Container fluid="md" className="mt-5">
      <Row className="justify-content-center mb-4">
        <div className="center mb-5">
          <div>
            <ProfileImage
              src={imgSrc ? imgSrc : user?.avatar}
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
            </label>
          </div>
        </div>
      </Row>
      <Row>
        <InputGroup className="mb-3 justify-content-center">
          <InputGroup.Text id="basic-addon1">@</InputGroup.Text>
          <Form.Control
            placeholder="Fullname"
            aria-label="Fullname"
            aria-describedby="basic-addon1"
            value={fullname}
            onChange={handleChange}
            style={{ maxWidth: "400px" }}
          />
        </InputGroup>
      </Row>
    </Container>
  );
}

export default PostRegister;
