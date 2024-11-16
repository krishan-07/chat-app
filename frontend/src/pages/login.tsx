import React, { useState } from "react";
import { Container, Stack } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { FaGithub, FaLock } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

function LoginPage() {
  const [data, setData] = useState({
    email: "",
    password: "",
  });

  const handleDataChange =
    (name: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setData({
        ...data,
        [name]: e.target.value,
      });
    };

  const handlelogin = () => {};
  return (
    <Container className="my-4" style={{ maxWidth: "400px" }}>
      <div className="center mb-4 fw-bold">
        <FaLock size={30} />
        <h2 className="ms-2 mb-0">Login</h2>
      </div>
      <Form onSubmit={handlelogin}>
        <Stack gap={1}>
          <Form.Group className="mb-3" controlId="email">
            <Form.Label>Email address or username</Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter email or username"
              onChange={handleDataChange("email")}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="formBasicPassword">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Password"
              onChange={handleDataChange("password")}
            />
          </Form.Group>
          <Button variant="primary" type="submit" className="fs-5">
            Submit
          </Button>
          <Form.Text className="text-light center mt-2">
            Don't have an acoount?{" "}
            <a href="/register" className="ms-2">
              Register
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
  );
}

export default LoginPage;
