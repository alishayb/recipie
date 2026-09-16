import { motion } from "framer-motion";
import { useState } from "react";
import "./LandingPage.css";
import desktopChatScreen from "./assets/screengrabs/desktop-chat.png";
import mobileChatScreen from "./assets/screengrabs/mobile-chat.png";
import mobileCookbookScreen from "./assets/screengrabs/mobile-my-recipes.png";
import { AuthModal } from "./section/auth/AuthModal";

const screens = {
  chat: mobileChatScreen,
  cookbook: mobileCookbookScreen,
  desktopChatScreen: desktopChatScreen,
};

const features = [
  [
    "1",
    "Drop in a recipe",
    "Upload PDFs, text notes, recipe screenshots, photos, or paste a TikTok recipe link. Recipie extracts the useful cooking information for you.",
  ],
  [
    "2",
    "Let Recipie organizes",
    "The assistant extracts and structures the recipe, then saves it to your personal collection so it can be retrieved later.",
  ],
  [
    "3",
    "Ask. Cook. Repeat.",
    "Chat with your cookbook to find dishes, use what you already have, and get help when an ingredient is missing.",
  ],
];

// One shared timing curve for the whole entrance sequence.
const EASE = [0.16, 1, 0.3, 1] as const;

const riseItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const heroTextStagger = {
  hidden: {},
  show: {
    transition: {
      delayChildren: 0.05,
      staggerChildren: 0.12,
    },
  },
};

const visualRise = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: EASE, delay: 0.3 },
  },
};

function Button({
  children = <></>,
  primary = false,
  href = "#",
  onClick,
}: {
  children?: React.ReactNode;
  primary?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const className = `button ${primary ? "primary" : "secondary"}`;
  const hoverY = primary ? -4 : -1;

  if (onClick) {
    return (
      <motion.button
        className={className}
        onClick={onClick}
        whileHover={{ y: hoverY }}
        whileTap={{ y: 0 }}
        transition={{ duration: 0.18 }}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <motion.a
      className={className}
      href={href}
      whileHover={{ y: hoverY }}
      whileTap={{ y: 0 }}
      transition={{ duration: 0.18 }}
    >
      {children}
    </motion.a>
  );
}

export default function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div>
      <div className="landing-page">
        <section className="hero" id="start">
          <div className="hero-grid container">
            <motion.div
              variants={heroTextStagger}
              initial="hidden"
              animate="show"
              className="hero-title"
            >
              <motion.div className="eyebrow" variants={riseItem}>
                <span className="circle" /> Your personal recipe assistant
              </motion.div>
              <motion.h1 variants={riseItem}>
                Ask what to cook and
                <br />
                <em>Get answers from your own collection.</em>
              </motion.h1>
              <motion.p className="hero-copy" variants={riseItem}>
                Recipie collects the recipes you've saved from photos, PDFs, and
                TikTok, then answers your cooking and recipes questions
                primarily from what's in your collection.
              </motion.p>
              <motion.div className="actions" variants={riseItem}>
                <Button primary onClick={() => setShowAuthModal(true)}>
                  Get Started →
                </Button>
                <Button href="#features">See how it works</Button>
              </motion.div>
              <motion.p className="micro" variants={riseItem}>
                Takes less than a minute to set up. Your recipes stay private to
                your account.
              </motion.p>
            </motion.div>

            <motion.div
              className="hero-visual"
              variants={visualRise}
              initial="hidden"
              animate="show"
            >
              <div className="glow" />
              <div className="browser">
                <div className="browser-bar">
                  <i />
                  <i />
                  <i />
                  <b />
                </div>
                <img
                  src={screens.desktopChatScreen}
                  alt="Recipie chat preview"
                />
              </div>
              <motion.div
                className="floating"
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: [0, -8, 0],
                }}
                transition={{
                  opacity: { duration: 0.5, ease: EASE, delay: 0.65 },
                  y: {
                    duration: 1,
                    ease: "easeInOut",
                    delay: 0.5,
                    repeat: Infinity,
                    repeatType: "loop",
                  },
                }}
              >
                <small>POWERED BY YOUR COLLECTION</small>
                <strong>"What can I make?"</strong>
                <span>Answers collected from your saved recipes.</span>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className="feature-container" id="features">
          <div className="section-head">
            <h2>
              Finding a recipe on your phone is such a <em>hassle!</em>
            </h2>
            <p>
              Instead of manually scrolling for it yourself, Recipie pulls
              together what's sitting in your photos, notes, and saved videos.
            </p>
          </div>
          <div className="features">
            {features.map(([icon, title, text]) => (
              <motion.article
                className="card"
                key={title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, ease: EASE }}
              >
                <div className="icon">{icon}</div>
                <h3>{title}</h3>
                <p>{text}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="showcase" id="cookbook">
          <motion.div
            className="showcase-copy"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <h2>Ask it what you can't remember</h2>
            <p>
              You know you saved a recipe with chicken and lemon somewhere. Just
              ask Recipie instead of scrolling through your camera roll to find
              it.
            </p>
            <div className="pills">
              {[
                "PDFs",
                "Photos",
                "Screenshots",
                "Text notes",
                "TikTok recipes",
                "Ingredient swaps",
              ].map((x) => (
                <span key={x}>{x}</span>
              ))}
            </div>
          </motion.div>
          <motion.div
            className="mini-cards"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
          >
            <figure>
              <figcaption>Ask your cookbook</figcaption>
              <img src={screens.chat} alt="Recipie chat screen" />
            </figure>
            <figure>
              <figcaption>Keep everything together</figcaption>
              <img src={screens.cookbook} alt="Recipie cookbook screen" />
            </figure>
          </motion.div>
        </section>

        <motion.section
          className="cta"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <h2>Your recipes are in one place.</h2>
          <p>
            Build a personal cookbook that&rsquo;s searchable, conversational,
            and ready to help when you&rsquo;re standing in the kitchen
            wondering what to make.
          </p>
          <Button primary onClick={() => setShowAuthModal(true)}>
            Start cooking →
          </Button>
        </motion.section>
      </div>

      <footer>
        <span>© 2026 Recipie</span>
        <span className="dot">•</span>
        <span>Built for home cooks who save too many recipes.</span>
      </footer>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}
