import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import errorIcon from "../../assets/ic-alert-circle.svg";
import successIcon from "../../assets/ic-check-circle.svg";
import "./toast.css";

type ToastType = "success" | "error";
const DEFAULT_TOAST_DATA: Record<ToastType, { icon: string }> = {
  success: {
    icon: successIcon,
  },
  error: {
    icon: errorIcon,
  },
};

const Toast = ({
  type,
  title,
  message,
  timeout = 8000,
}: {
  type: ToastType;
  title: string;
  message: string;
  timeout?: number; /** number in miliseconds */
}) => {
  const [display, setDisplay] =
    useState<React.CSSProperties["display"]>("flex");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplay("none");
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout]);

  return createPortal(
    <div className={`toast ${type}`} style={{ display }}>
      <img
        src={DEFAULT_TOAST_DATA[type].icon}
        alt={`${type} icon`}
        width={18}
      />
      <div className="content">
        <p className="title">{title}</p>
        <p className="message">{message}</p>
      </div>
    </div>,
    document.body,
  );
};

export default Toast;
