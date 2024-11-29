import React, { FormEvent, useState } from "react";
import { Button, Container, Form, Stack } from "react-bootstrap";
import { FaRegUser } from "react-icons/fa";

import { useAuth } from "../context/AuthContext";
import { GoogleAndGitHubSignInButtons } from "../components/Button";

function RegisterPage() {
  const [data, setData] = useState({
    email: "",
    fullname: "",
    password: "",
    confirmPassword: "",
  });

  const { register } = useAuth();
  const handleDataChange =
    (name: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setData({
        ...data,
        [name]: e.target.value,
      });
    };

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (data.email !== "" && data.fullname !== "") {
      if (data.password !== data.confirmPassword) {
        alert("Password didn't match");
        return;
      }
      await register({
        email: data.email,
        fullname: data.fullname,
        username: data.email.split("@")[0],
        password: data.password,
      });
      return;
    }

    alert("Please enter the fields");
  };

  return (
    <>
      <Container className="my-4" style={{ maxWidth: "400px" }}>
        <div className="center mb-4 fw-bold">
          <FaRegUser size={30} />
          <h2 className="ms-2 mb-0">Register</h2>
        </div>
        <Form onSubmit={handleRegister} action="submit">
          <Stack gap={1}>
            <Form.Group className="mb-3" controlId="email">
              <Form.Label>Email address</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter email"
                onChange={handleDataChange("email")}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="username">
              <Form.Label>Fullname</Form.Label>
              <Form.Control
                type="name"
                placeholder="Enter username"
                onChange={handleDataChange("fullname")}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="password">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Enter your password"
                onChange={handleDataChange("password")}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="confirmPassword">
              <Form.Label>Confirm password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Enter your password again"
                onChange={handleDataChange("confirmPassword")}
              />
            </Form.Group>
            <Button variant="primary" type="submit" className="fs-5">
              Submit
            </Button>
            <Form.Text className="text-light center mt-2">
              Already having an account?
              <a href="/login" className="ms-2">
                Login
              </a>
            </Form.Text>
          </Stack>
          <GoogleAndGitHubSignInButtons />
        </Form>
      </Container>
    </>
  );
}

export default RegisterPage;
