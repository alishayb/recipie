import { useState, useEffect, useRef } from "react";
import "./LegalPage.css";

type Doc = "privacy" | "terms";

interface Section {
  id: string;
  title: string;
}

const PRIVACY_SECTIONS: Section[] = [
  { id: "overview", title: "Overview" },
  { id: "what-we-collect", title: "What we collect" },
  { id: "how-we-use-it", title: "How we use it" },
  { id: "third-parties", title: "Who we share it with" },
  { id: "retention", title: "How long we keep it" },
  { id: "your-controls", title: "Your controls" },
  { id: "security", title: "Security" },
  { id: "children", title: "Children's privacy" },
  { id: "changes", title: "Changes to this policy" },
  { id: "contact", title: "Contact" },
];

const TERMS_SECTIONS: Section[] = [
  { id: "acceptance", title: "Acceptance of terms" },
  { id: "the-service", title: "The service" },
  { id: "accounts", title: "Accounts" },
  { id: "your-content", title: "Your content" },
  { id: "acceptable-use", title: "Acceptable use" },
  { id: "ai-limitations", title: "AI-generated content" },
  { id: "availability", title: "Availability" },
  { id: "termination", title: "Termination" },
  { id: "disclaimers", title: "Disclaimers" },
  { id: "liability", title: "Limitation of liability" },
  { id: "changes-terms", title: "Changes to these terms" },
  { id: "contact-terms", title: "Contact" },
];

const LAST_UPDATED = "September 16, 2026";
const APP_NAME = "Recipie";
const CONTACT_EMAIL = "hello@recipie.app"; // TODO: replace with real contact address

export default function LegalPage({ initialDoc = "privacy" }: { initialDoc?: Doc }) {
  const [activeDoc, setActiveDoc] = useState<Doc>(initialDoc);
  const [activeSection, setActiveSection] = useState<string>(
    (initialDoc === "privacy" ? PRIVACY_SECTIONS : TERMS_SECTIONS)[0]?.id ?? ""
  );
  const contentRef = useRef<HTMLDivElement>(null);

  const sections = activeDoc === "privacy" ? PRIVACY_SECTIONS : TERMS_SECTIONS;

  const handleDocChange = (doc: Doc) => {
    setActiveDoc(doc);
    const firstSection = (doc === "privacy" ? PRIVACY_SECTIONS : TERMS_SECTIONS)[0]?.id ?? "";
    setActiveSection(firstSection);
  };

  useEffect(() => {
    const headings = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [activeDoc, sections]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="legal-page">
      <header className="legal-header">
        <div className="legal-header__inner">
          <span className="legal-header__brand">{APP_NAME}</span>
          <div className="legal-header__toggle" role="tablist" aria-label="Legal document">
            <button
              role="tab"
              aria-selected={activeDoc === "privacy"}
              className={activeDoc === "privacy" ? "is-active" : ""}
              onClick={() => handleDocChange("privacy")}
            >
              Privacy Policy
            </button>
            <button
              role="tab"
              aria-selected={activeDoc === "terms"}
              className={activeDoc === "terms" ? "is-active" : ""}
              onClick={() => handleDocChange("terms")}
            >
              Terms of Service
            </button>
          </div>
        </div>
      </header>

      <div className="legal-body">
        <nav className="legal-nav" aria-label="Sections">
          <p className="legal-nav__updated">Last updated {LAST_UPDATED}</p>
          <ul>
            {sections.map((s) => (
              <li key={s.id}>
                <button
                  className={activeSection === s.id ? "is-active" : ""}
                  onClick={() => scrollToSection(s.id)}
                >
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <article className="legal-content" ref={contentRef}>
          {activeDoc === "privacy" ? <PrivacyPolicy /> : <TermsOfService />}
        </article>
      </div>
    </div>
  );
}

function PrivacyPolicy() {
  return (
    <article>
      <h1>Privacy Policy</h1>
      <p className="legal-intro">
        This explains what {APP_NAME} collects when you use it, why, and what say you have
        over it. {APP_NAME} is a personal recipe assistant: you save recipes from PDFs,
        photos, or text, and ask questions about your own collection. This policy covers
        the data that involves.
      </p>

      <section id="overview">
        <h2>Overview</h2>
        <p>
          {APP_NAME} is built around one idea: your recipes should answer your questions,
          not the open internet's. To do that, we store the recipes you upload and the
          account details needed to keep your collection private to you. We don't sell
          your data, and we don't use your recipes to train AI models beyond what's needed
          to answer your own questions.
        </p>
      </section>

      <section id="what-we-collect">
        <h2>What we collect</h2>
        <h3>Account information</h3>
        <p>
          When you sign up, we collect your email address and, if you use Google sign-in,
          your name and profile photo as provided by Google. Authentication is handled by
          Firebase Auth; we don't see or store your password directly.
        </p>
        <h3>Recipes you upload</h3>
        <p>
          When you upload a PDF, photo, or paste in text, we extract the recipe content —
          title, ingredients, steps — and store that text. If you submit a photo or PDF,
          the file is processed to extract text and then discarded; we don't keep the
          original image or document after extraction.
        </p>
        <h3>Chat messages</h3>
        <p>
          We store the questions you ask and the answers you receive, so your conversation
          history is available when you come back.
        </p>
        <h3>Usage data</h3>
        <p>
          We collect basic technical data — timestamps, request logs, error logs — to keep
          the service running and to diagnose problems. This isn't tied to your identity
          beyond your account.
        </p>
      </section>

      <section id="how-we-use-it">
        <h2>How we use it</h2>
        <ul>
          <li>To store and retrieve your recipes when you ask a question</li>
          <li>To generate answers and substitution suggestions using your recipe collection</li>
          <li>To keep your account secure and your data isolated from other users</li>
          <li>To diagnose bugs and improve reliability</li>
        </ul>
        <p>
          Your recipe text is converted into embeddings — numerical representations used
          for search — so the assistant can find relevant recipes when you ask a question.
          These embeddings are derived from your content and used only to serve your own
          queries.
        </p>
      </section>

      <section id="third-parties">
        <h2>Who we share it with</h2>
        <p>
          We use a small number of third-party services to run {APP_NAME}. We don't sell
          your data to anyone, and we don't share it for advertising.
        </p>
        <ul>
          <li>
            <strong>Google Gemini API</strong> — processes your uploaded content (text
            extraction, image recognition, chat responses, embeddings). Content you upload
            is sent to Gemini to generate these results.
          </li>
          <li>
            <strong>Firebase Authentication</strong> — manages sign-in and account
            security.
          </li>
        </ul>
        <p>
          Each of these providers processes data under their own privacy terms in addition
          to this one. We don't control how they secure data on their end, though we
          choose providers that meet reasonable security standards.
        </p>
      </section>

      <section id="retention">
        <h2>How long we keep it</h2>
        <p>
          We keep your recipes and chat history for as long as your account is active.
          Uploaded files are discarded immediately after text extraction — we never
          retain the originals. If you delete your account, we delete your recipes,
          chat history, and account information within a reasonable period, except where
          we're required to retain something for legal reasons.
        </p>
      </section>

      <section id="your-controls">
        <h2>Your controls</h2>
        <p>You can, at any time:</p>
        <ul>
          <li>Delete individual recipes from your collection</li>
          <li>Delete your chat history</li>
          <li>Delete your account, which removes your stored data as described above</li>
          <li>Request a copy of the data we hold about you by contacting us</li>
        </ul>
      </section>

      <section id="security">
        <h2>Security</h2>
        <p>
          Your data is isolated per account — other users can't see your recipes or
          conversations. Access to the backend is authenticated, and connections to
          {" " + APP_NAME} are encrypted in transit. No system is perfectly secure, and we
          can't guarantee absolute protection against every possible breach, but we take
          reasonable steps to protect your data.
        </p>
      </section>

      <section id="children">
        <h2>Children's privacy</h2>
        <p>
          {APP_NAME} isn't directed at children under 13, and we don't knowingly collect
          data from children under 13. If you believe a child has created an account, contact
          us and we'll remove it.
        </p>
      </section>

      <section id="changes">
        <h2>Changes to this policy</h2>
        <p>
          If we make material changes to this policy, we'll update the date at the top of
          this page and, where appropriate, notify you directly. Continued use of{" "}
          {APP_NAME} after a change means you accept the updated policy.
        </p>
      </section>

      <section id="contact">
        <h2>Contact</h2>
        <p>
          Questions about this policy or your data? Reach out at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </article>
  );
}

function TermsOfService() {
  return (
    <article>
      <h1>Terms of Service</h1>
      <p className="legal-intro">
        These terms cover your use of {APP_NAME}. By creating an account or using the
        service, you agree to them. If something here doesn't sit right, reach out before
        signing up — we'd rather clarify than have you agree to something you're not sure
        about.
      </p>

      <section id="acceptance">
        <h2>Acceptance of terms</h2>
        <p>
          By accessing or using {APP_NAME}, you agree to be bound by these terms and our
          Privacy Policy. If you don't agree, please don't use the service.
        </p>
      </section>

      <section id="the-service">
        <h2>The service</h2>
        <p>
          {APP_NAME} lets you upload recipes from PDFs, photos, and text, and ask questions
          about your own collection using an AI assistant. Answers are grounded in the
          recipes you've saved; substitution suggestions may draw on general knowledge
          beyond your collection.
        </p>
      </section>

      <section id="accounts">
        <h2>Accounts</h2>
        <p>
          You need an account to use {APP_NAME}, created via email/password or Google
          sign-in. You're responsible for keeping your credentials secure and for
          activity that happens under your account. Let us know right away if you suspect
          unauthorized access.
        </p>
      </section>

      <section id="your-content">
        <h2>Your content</h2>
        <p>
          You retain ownership of the recipes and content you upload. By uploading
          content, you give us permission to store, process, and use it solely to
          provide the service to you — extracting text, generating embeddings, and
          answering your questions.
        </p>
        <p>
          You're responsible for making sure you have the right to upload the content
          you submit. Don't upload material that infringes someone else's copyright or
          other rights.
        </p>
      </section>

      <section id="acceptable-use">
        <h2>Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use {APP_NAME} for anything unlawful or to infringe others' rights</li>
          <li>Attempt to access another user's account or data</li>
          <li>Interfere with or disrupt the service, including by overloading it</li>
          <li>Reverse-engineer or attempt to extract the underlying source code, except as permitted by law</li>
          <li>Use the service to build a competing product</li>
        </ul>
      </section>

      <section id="ai-limitations">
        <h2>AI-generated content</h2>
        <p>
          {APP_NAME} uses AI to extract text, answer questions, and suggest substitutions.
          AI output can be wrong — a substitution suggestion may not work as expected,
          and extracted recipe text may contain errors, especially from handwritten notes
          or low-quality images. Use your own judgment, particularly for anything related
          to food safety, allergies, or dietary restrictions. We're not responsible for
          outcomes from following AI-generated suggestions.
        </p>
      </section>

      <section id="availability">
        <h2>Availability</h2>
        <p>
          We aim to keep {APP_NAME} available, but we don't guarantee uninterrupted
          access. The service may be unavailable for maintenance, updates, or reasons
          outside our control, including outages from third-party providers we depend on.
        </p>
      </section>

      <section id="termination">
        <h2>Termination</h2>
        <p>
          You can delete your account at any time. We may suspend or terminate accounts
          that violate these terms, with notice where reasonably possible. On
          termination, your data is handled as described in the Privacy Policy.
        </p>
      </section>

      <section id="disclaimers">
        <h2>Disclaimers</h2>
        <p>
          {APP_NAME} is provided "as is," without warranties of any kind, express or
          implied. We don't warrant that the service will be error-free, that AI-extracted
          or AI-generated content will be accurate, or that it will meet your specific
          needs.
        </p>
      </section>

      <section id="liability">
        <h2>Limitation of liability</h2>
        <p>
          To the extent permitted by law, {APP_NAME} and its operator aren't liable for
          indirect, incidental, or consequential damages arising from your use of the
          service, including damages related to inaccurate recipe extraction or
          substitution suggestions.
        </p>
      </section>

      <section id="changes-terms">
        <h2>Changes to these terms</h2>
        <p>
          We may update these terms from time to time. If we make material changes,
          we'll update the date at the top of this page. Continued use after a change
          means you accept the updated terms.
        </p>
      </section>

      <section id="contact-terms">
        <h2>Contact</h2>
        <p>
          Questions about these terms? Reach out at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </article>
  );
}