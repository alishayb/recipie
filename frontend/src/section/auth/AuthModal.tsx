import { useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";
import ContinueWithGoogle from "../../assets/google/ContinueWithGoogle";
import hidePasswordIcon from "../../assets/ic-eye-slash.svg";
import showPasswordIcon from "../../assets/ic-eye.svg";
import closeIcon from "../../assets/ic-xmark.svg";
import { useAuth } from "../../hooks/useAuth";
import "./AuthModal.css";

interface AuthModalProps {
  onClose: () => void;
}

type Mode = "login" | "signup";

export function AuthModal({ onClose }: AuthModalProps) {
  const { login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setError(null);

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      onClose();
      navigate("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
      onClose();
      navigate("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(event) => event.stopPropagation()}>
        <button
          className="auth-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <img src={closeIcon} alt="Close" width={32} />
        </button>

        {mode === "signup" ? (
          <>
            <h2 className="auth-modal-title">Save every recipe in one place</h2>
            <p className="auth-modal-subtitle">
              Create your personal recipe shelf.
            </p>
          </>
        ) : (
          <>
            <h2 className="auth-modal-title">Welcome back to Recipie</h2>
            <p className="auth-modal-subtitle">
              Your recipe shelf is ready for you.
            </p>
          </>
        )}

        <div className="auth-modal-form-container">
          <div className="auth-modal-google" onClick={handleGoogleSignIn}>
            <ContinueWithGoogle />
          </div>

          <div className="auth-modal-divider">
            <span>or</span>
          </div>

          <form onSubmit={handleSubmit} className="auth-modal-form">
            <label className="auth-modal-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="auth-modal-input"
              required
            />

            <label className="auth-modal-label" htmlFor="password">
              Password
            </label>
            <div className="auth-modal-password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="auth-modal-input"
                minLength={8}
                required
              />
              <button
                type="button"
                className="auth-modal-toggle-visibility"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <img src={showPasswordIcon} alt="Show password" width={20} />
                ) : (
                  <img src={hidePasswordIcon} alt="Hide password" width={20} />
                )}
              </button>
            </div>
            {mode === "login" && (
              <div className="auth-modal-forgot-password">
                <a href="#">Forgot password?</a>
              </div>
            )}

            {mode === "signup" && (
              <>
                <label className="auth-modal-label" htmlFor="confirm-password">
                  Confirm password
                </label>
                <div className="auth-modal-password-wrapper">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="auth-modal-input"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="auth-modal-toggle-visibility"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <img
                        src={showPasswordIcon}
                        alt="Show password"
                        width={20}
                      />
                    ) : (
                      <img
                        src={hidePasswordIcon}
                        alt="Hide password"
                        width={20}
                      />
                    )}
                  </button>
                </div>
              </>
            )}

            {error && <p className="auth-modal-error">{error}</p>}

            <button
              type="submit"
              className="auth-modal-submit"
              disabled={submitting}
            >
              {mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>
        </div>

        <div className="auth-modal-other">
          <div className="auth-modal-switch">
            {mode === "login" ? (
              <>
                New to Recipie?{" "}
                <button
                  type="button"
                  className="auth-modal-link"
                  onClick={() => setMode("signup")}
                >
                  Create account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="auth-modal-link"
                  onClick={() => setMode("login")}
                >
                  Log in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
