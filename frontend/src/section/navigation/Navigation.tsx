import { NavLink } from "react-router-dom";
import bookActiveIcon from "../../assets/ic-book-recipe-active.svg";
import bookIcon from "../../assets/ic-book-recipe.svg";
import chatActiveIcon from "../../assets/ic-chat-active.svg";
import chatIcon from "../../assets/ic-chat.svg";
import plusActiveIcon from "../../assets/ic-plus-active.svg";
import plusIcon from "../../assets/ic-plus.svg";
import recipieLogo from "../../assets/logo-recipie.svg";
import "./navigation.css";

export type Tabs = {
  id: string;
  label: string;
  icon: string;
  activeIcon: string;
};

const TABS: Tabs[] = [
  { id: "", label: "Chat", icon: chatIcon, activeIcon: chatActiveIcon },
  { id: "upload", label: "Upload", icon: plusIcon, activeIcon: plusActiveIcon },
  {
    id: "recipes",
    label: "My Recipe",
    icon: bookIcon,
    activeIcon: bookActiveIcon,
  },
];

const Navigation = () => {
  return (
    <nav>
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
    </nav>
  );
};

export default Navigation;
