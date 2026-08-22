import chatProfileLogo from "../../assets/ic-chat-profile.svg";
import "./bubbleChat.css";

const RecipieLoadingChat = () => {
  return (
    <div className="recipie-bubble-chat">
      <img src={chatProfileLogo} alt="Chat Profile Logo" width={36} />
      <div className="loading-chat">
        <div className="loader" />
      </div>
    </div>
  );
};

export default RecipieLoadingChat;
