import { useEffect } from "react";
import Loading from "../components/Loading";
import { useAuth } from "../context/AuthContext";
import { extractParamsfromSearchUrl } from "../utils";

function Redirect() {
  const { Auth } = useAuth();

  useEffect(() => {
    const accessToken = extractParamsfromSearchUrl(
      window.location.href,
      "accessToken"
    );
    async function func() {
      if (typeof accessToken === "string") await Auth({ accessToken });
    }
    func();
  }, []);

  return <Loading />;
}

export default Redirect;
