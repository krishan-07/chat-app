import React, { useState } from "react";
import { Button, Container, Form, Stack } from "react-bootstrap";
import { FaGithub, FaRegUser } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

function RegisterPage() {
  const [data, setData] = useState({
    email: "",
    password: "",
    username: "",
    confirmPassword: "",
  });

  const handleDataChange =
    (name: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setData({
        ...data,
        [name]: e.target.value,
      });
    };
  const handleRegister = () => {};

  return (
    <>
      <Container className="my-4" style={{ maxWidth: "400px" }}>
        <div className="center mb-4 fw-bold">
          <FaRegUser size={30} />
          <h2 className="ms-2 mb-0">Register</h2>
        </div>
        <Form onSubmit={handleRegister}>
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
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter username"
                onChange={handleDataChange("username")}
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
          <hr className="my-4" />
          <Stack gap={3}>
            <Button type="button" variant="light" className="center">
              <FcGoogle size={30} className="me-2" />
              Sign in with Google
            </Button>
            <Button type="button" variant="light" className="center">
              <FaGithub size={30} className="me-2" />
              Sign in with GitHub
            </Button>
          </Stack>
        </Form>
      </Container>
    </>
  );
}

export default RegisterPage;
