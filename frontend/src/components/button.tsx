import React from "react";
import { Button, Stack } from "react-bootstrap";
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

interface Props {
  text: string;
}

const GoogleAndGitHubSignInButtons: React.FC<Props> = ({ text }) => {
  const handleGithubLogin = async () => {
    window.location.href = "http://localhost:8080/api/v1/users/auth/github";
  };

  return (
    <Stack gap={3}>
      <Button type="button" variant="light" className="center">
        <FcGoogle size={30} className="me-2" />
        Sign {text} with Google
      </Button>
      <Button
        type="button"
        variant="light"
        className="center"
        onClick={handleGithubLogin}
      >
        <FaGithub size={30} className="me-2" />
        Sign {text} with GitHub
      </Button>
    </Stack>
  );
};

export { GoogleAndGitHubSignInButtons };
