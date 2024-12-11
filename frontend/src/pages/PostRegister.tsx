import ProfileImage from "../components/ProfileImage";
import { MdModeEditOutline } from "react-icons/md";
import { useAuth } from "../context/AuthContext";
import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Container,
  Form,
  InputGroup,
  Row,
  Spinner,
} from "react-bootstrap";
import ImageCropModal from "../components/CropImage/ImageCropModal";
import { Crop } from "react-image-crop";
import { getCurrentUser, updateAvatar, updateUserDetails } from "../api";
import { blobUrlToFile, LocalStorage } from "../utils";
import { useNavigate } from "react-router-dom";

function PostRegister() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imgSrc, setImgSrc] = useState("");
  const [fullname, setFullname] = useState<string>(user?.fullname || "");
  const [crop, setCrop] = useState<Crop>();

  const [show, setShow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFullname(e.target.value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
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

      handleShow();

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (imgSrc) await updateAvatar(await blobUrlToFile(imgSrc));
      if (fullname !== user?.fullname) await updateUserDetails(fullname, "");

      const newUser = await getCurrentUser();

      LocalStorage.set("user", newUser.data.data);
    } catch (error) {
      console.warn(error);
      alert(error);
    }
    setIsLoading(false);

    navigate("/chat");
  };

  useEffect(() => {
    if (user) setFullname(user?.fullname);
  }, [user]);

  return (
    <Container fluid="md" className="mt-5 center">
      <Card
        style={{
          minWidth: "300px",
          width: "400px",
          backgroundColor: "#1c1e1f",
          color: "white",
        }}
      >
        <Card.Body>
          <Row className="justify-content-center">
            <div className="center mb-5">
              <div className="my-3">
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
            <Form.Label htmlFor="fullname" className="mb-2">
              Your fullname
            </Form.Label>
            <InputGroup className="mb-3 justify-content-center">
              <InputGroup.Text id="basic-addon1">@</InputGroup.Text>
              <Form.Control
                placeholder="fullname"
                aria-label="fullname"
                aria-describedby="basic-addon1"
                value={fullname}
                onChange={handleChange}
                style={{ maxWidth: "700px" }}
              />
            </InputGroup>
          </Row>
          <div className="mt-5">
            <Row style={{ margin: "0 0.005rem" }}>
              <Button type="button" onClick={handleSubmit}>
                {isLoading ? (
                  <Spinner animation="border" role="status" size="sm" />
                ) : (
                  "Next"
                )}
              </Button>
            </Row>
          </div>
        </Card.Body>
      </Card>
      <ImageCropModal
        show={show}
        handleClose={handleClose}
        imgSrc={imgSrc}
        setImgSrc={setImgSrc}
        crop={crop}
        setCrop={setCrop}
      />
    </Container>
  );
}

export default PostRegister;
