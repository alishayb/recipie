import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import bookActiveIcon from "../../assets/ic-book-recipe-active.svg";
import bookIcon from "../../assets/ic-book-recipe.svg";
import chatActiveIcon from "../../assets/ic-chat-active.svg";
import chatIcon from "../../assets/ic-chat.svg";
import plusActiveIcon from "../../assets/ic-plus-active.svg";
import plusIcon from "../../assets/ic-plus.svg";
import userActiveIcon from "../../assets/ic-user-active.svg";
import userIcon from "../../assets/ic-user.svg";
import recipieLogo from "../../assets/logo-recipie.svg";
import { RANDOM_CHEFS_NOTE_LIST } from "../../constants/constants";
import { useAuth } from "../../hooks/useAuth";
import "./navigation.css";

export type Tabs = {
  id: string;
  label: string;
  icon: string;
  activeIcon: string;
};

const TABS: Tabs[] = [
  { id: "chat", label: "Chat", icon: chatIcon, activeIcon: chatActiveIcon },
  { id: "upload", label: "Upload", icon: plusIcon, activeIcon: plusActiveIcon },
  {
    id: "recipes",
    label: "Cookbook",
    icon: bookIcon,
    activeIcon: bookActiveIcon,
  },
  {
    id: "profile",
    label: "Profile",
    icon: userIcon,
    activeIcon: userActiveIcon,
  },
];

const CHAT_PATHS = ["/chat", "/upload", "/recipes", "/profile"];

const Navigation = () => {
  const [chefsNoteId] = useState(() =>
    Math.floor(Math.random() * RANDOM_CHEFS_NOTE_LIST.length),
  );
  const location = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (CHAT_PATHS.some((path) => location.pathname.startsWith(path))) {
    const displayName =
      user?.displayName || user?.email?.split("@")[0] || "User";
    const initial = displayName.charAt(0).toUpperCase();

    return (
      <nav>
        <div className="upper">
          <div className="recipie-logo">
            <img src={recipieLogo} alt="Recipie" />
            <p>Recipie</p>
          </div>

          {TABS.map((tab) => (
            <NavLink
              key={tab.id}
              to={tab.id}
              className={({ isActive }) =>
                isActive ? "nav-item active" : "nav-item"
              }
              id={tab.id}
            >
              {({ isActive }) => (
                <>
                  <img
                    src={isActive ? tab.activeIcon : tab.icon}
                    alt={tab.label}
                  />
                  <p>{tab.label}</p>
                </>
              )}
            </NavLink>
          ))}

          <div className="chefs-note">
            <p>Chef's Note</p>
            <p>&ldquo;{RANDOM_CHEFS_NOTE_LIST[chefsNoteId]}&rdquo;</p>
          </div>
        </div>

        <div className="lower" onClick={() => navigate("/profile")}>
          <div className="user-avatar">{initial}</div>
          <div className="user-data">
            <p className="name">{displayName.split(" ")[0]}</p>
            <p className="email">{user?.email}</p>
          </div>
        </div>
      </nav>
    );
  } else return null;
};

export default Navigation;
