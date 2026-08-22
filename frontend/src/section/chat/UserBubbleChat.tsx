import ReactMarkdown from "react-markdown";
import "./bubbleChat.css";
import type { Message } from "./ChatArea";

const UserBubbleChat = ({ message }: { message: Message }) => {
  const date = new Date(message.created_at);
  const formatted = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="user-bubble-chat">
      <div className="bubble-chat">
        <div className="markdown-content">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        <time dateTime={date.toISOString()}>{formatted}</time>
      </div>
    </div>
  );
};

export default UserBubbleChat;
