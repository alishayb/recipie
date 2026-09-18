import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import "./footer.css";

export function Footer({ onLogin }: { onLogin: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleProtectedLink = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    if (!user) {
      onLogin();
      return;
    }
    navigate(path);
  };

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <p className="footer-wordmark">Recipie</p>
            <p>
              Upload the recipes you already have — PDFs, photos, saved links —
              and ask what to cook without digging through folders.
            </p>
          </div>

          <div className="footer-col">
            <h3>Product</h3>
            <ul>
              <li>
                <Link
                  to="/upload"
                  onClick={(e) => handleProtectedLink(e, "/upload")}
                >
                  Upload a recipe
                </Link>
              </li>
              <li>
                <Link
                  to="/chat"
                  onClick={(e) => handleProtectedLink(e, "/chat")}
                >
                  Ask the assistant
                </Link>
              </li>
              <li>
                <Link
                  to="/collection"
                  onClick={(e) => handleProtectedLink(e, "/collection")}
                >
                  Your collection
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h3>Support</h3>
            <ul>
              <li>
                <a href="mailto:customer-service@recipie.dpdns.org">
                  Contact us
                </a>
              </li>
              <li>
                <Link to="/privacy-policy">Privacy policy</Link>
              </li>
              <li>
                <Link to="/terms-of-service">Terms of service</Link>
              </li>
            </ul>
          </div>
        </div>

        <hr className="footer-divider" />

        <div className="footer-bottom">
          <p>&copy; 2026 Recipie</p>
          <p className="footer-tagline">
            Built for home cooks who save too many recipes.
          </p>
        </div>
      </div>
    </footer>
  );
}
