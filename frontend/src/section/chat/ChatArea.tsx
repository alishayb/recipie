import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import chatProfileLogo from "../../assets/ic-chat-profile.svg";
import ellipseIcon from "../../assets/ic-ellipse.svg";
import sendIcon from "../../assets/ic-send.svg";
import utensilsIcon from "../../assets/ic-utensils.svg";
import { API_BASE_URL } from "../../constants/constants";
import { getDateKey, getDayLabel } from "../../utils/date";
import "./chatArea.css";
import ErrorChat from "./ErrorChat";
import RecipieBubbleChat from "./RecipieBubbleChat";
import RecipieLoadingChat from "./RecipieLoadingChat";
import UserBubbleChat from "./UserBubbleChat";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type RenderItem =
  | { type: "badge"; date: string; key: string }
  | { type: "message"; message: Message; key: string };

const ChatArea = () => {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [input, setInput] = useState("");

  const { data: messages, error: messageErr } = useQuery({
    queryKey: ["messages"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/messages`);
      if (!res.ok) throw new Error("Failed to load messages");
      return res.json() as Promise<Message[]>;
    },
    retry: false,
  });
  const queryClient = useQueryClient();
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`${API_BASE_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: content }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onMutate: async (content: string) => {
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        role: "user",
        content,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Message[]>(["messages"], (old = []) => [
        ...old,
        optimisticMessage,
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });

  const renderItems: RenderItem[] = useMemo(() => {
    if (!messages) return [];

    const items: RenderItem[] = [];
    let lastDateKey: string | null = null;

    for (const message of messages) {
      const dateKey = getDateKey(message.created_at);

      if (dateKey !== lastDateKey) {
        items.push({
          type: "badge",
          date: getDayLabel(message.created_at),
          key: `badge-${dateKey}`,
        });
        lastDateKey = dateKey;
      }

      items.push({ type: "message", message, key: message.id });
    }

    return items;
  }, [messages]);

  const handleInput = () => {
    const element = textareaRef.current;
    if (element) {
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight}px`;
    }
    setInput(element?.value ?? "");
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const question = input.trim();
    if (!question) return;

    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }

    sendMessage.mutate(question);
    setInput("");
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMessage.isPending]);

  return (
    <section className="chat-area">
      <div className="chat-header">
        <img
          src={chatProfileLogo}
          alt="Chat Profile Logo"
          className="recipie-logo"
        />
        <div className="recipie-header">
          <p className="name">Recipie Assistant</p>
          <p className="subtext">
            <img src={ellipseIcon} alt="Ellipse" />
            <span>Ready to cook</span>
          </p>
        </div>
      </div>

      <div className="chat">
        {messageErr ? (
          <ErrorChat errorMsg={messageErr.message} />
        ) : (
          renderItems.map((item) =>
            item.type === "badge" ? (
              <div className="date-badge">{item.date}</div>
            ) : item.message.role === "assistant" ? (
              <RecipieBubbleChat key={item.key} message={item.message} />
            ) : (
              <UserBubbleChat key={item.key} message={item.message} />
            ),
          )
        )}
        {sendMessage.isPending && <RecipieLoadingChat />}
        <div ref={chatEndRef} />
      </div>
      <form className="chat-textbox" onSubmit={handleSubmit}>
        <div className="text-input">
          <img src={utensilsIcon} alt="Text input" />
          <textarea
            id="chat"
            name="chat"
            autoFocus
            ref={textareaRef}
            onInput={handleInput}
            rows={1}
            placeholder="Ask anything"
            onKeyDown={(e) => {
              const isMobile = window.matchMedia("(max-width: 768px)").matches;
              if (e.key === "Enter" && !e.shiftKey && !isMobile) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          ></textarea>
        </div>
        <button className="sendbox" type="submit">
          <img src={sendIcon} alt="Send" />
        </button>
      </form>
    </section>
  );
};

export default ChatArea;
