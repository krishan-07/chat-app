import { Button, Stack } from "react-bootstrap";
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

const GoogleAndGitHubSignInButtons = () => {
  const handleGithubLogin = async () => {
    window.location.href = import.meta.env.VITE_GITHUB_CALLBACK_URL;
  };

  return (
    <>
      <div className="my-4 ">
        <div className="center position-relative z-1">
          <span style={{ padding: "0 7px", background: "#212529" }}>or</span>
        </div>

        <hr className="position-relative" style={{ top: "-27px" }} />
      </div>
      <Stack gap={3}>
        <Button type="button" variant="light" className="center">
          <FcGoogle size={30} className="me-2" />
          Continue with Google
        </Button>
        <Button
          type="button"
          variant="light"
          className="center"
          onClick={handleGithubLogin}
        >
          <FaGithub size={30} className="me-2" />
          Continue with GitHub
        </Button>
      </Stack>
    </>
  );
};

export { GoogleAndGitHubSignInButtons };
