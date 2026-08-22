import alertIcon from "../../assets/ic-alert-triangle.svg";
import "./bubbleChat.css";

const ErrorChat = ({ errorMsg }: { errorMsg?: string }) => {
  return (
    <div className="recipie-error-chat">
      <img src={alertIcon} alt="Error icon" width={36} />
      <div className="error-chat">
        <p className="error">
          {errorMsg
            ? errorMsg
            : "Something went wrong. I couldn't process that request."}
        </p>
      </div>
    </div>
  );
};

export default ErrorChat;
