import ReactMarkdown from "react-markdown";
import chatProfileLogo from "../../assets/ic-chat-profile.svg";
import "./bubbleChat.css";
import type { Message } from "./ChatArea";

const RecipieBubbleChat = ({ message }: { message: Message }) => {
  const date = new Date(message.created_at);
  const formatted = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="recipie-bubble-chat">
      <img src={chatProfileLogo} alt="Chat Profile Logo" width={36} />
      <div className="bubble-chat">
        <div className="markdown-content">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        <time dateTime={date.toISOString()}>{formatted}</time>
      </div>
    </div>
  );
};

export default RecipieBubbleChat;
