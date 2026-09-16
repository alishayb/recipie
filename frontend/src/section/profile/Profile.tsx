import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import "./profile.css";

const ProfilePage = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  const initial = user?.displayName?.[0] ?? user?.email?.[0] ?? "?";
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <section className="profile-page">
      <div className="profile-card">
        <h1>Profile</h1>
        <div className="profile-avatar">{initial.toUpperCase()}</div>

        <div className="profile-field">
          <span className="profile-label">Name</span>
          <span className="profile-value">
            {user?.displayName || "Not set"}
          </span>
        </div>

        <div className="profile-field">
          <span className="profile-label">Email</span>
          <span className="profile-value">{user?.email}</span>
        </div>

        <button aria-label="logout" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {loading && <div className="loading-auth" />}
    </section>
  );
};

export default ProfilePage;
