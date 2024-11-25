import { Spinner } from "react-bootstrap";

function Loading() {
  return (
    <div className="center mt-4">
      <Spinner animation="grow" role="status">
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    </div>
  );
}

export default Loading;
