import { useState } from "react";
import SignInModal from "./SignInModal";
import SignUpModal from "./SignUpModal";

const FEATURES = [
  "Upload a reference image in seconds",
  "Watch phases of prompt generation in real time",
  "Save the best prompts for future shoots",
];

export default function Landing() {
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  return (
    <div className="landing">
      <div className="landing-card">
        <span className="landing-pill">AI prompt studio</span>
        <h1>PromptLens</h1>
        <p className="landing-subtitle">
          Generate polished prompts from any reference photo. Keep your moodboards, 
          inspiration and final prompts in a single place.
        </p>

        <div className="landing-actions">
          <button className="landing-btn primary" onClick={() => setShowSignIn(true)}>
            Sign In
          </button>
          <button className="landing-btn ghost" onClick={() => setShowSignUp(true)}>
            Create account
          </button>
        </div>

        <ul className="landing-features">
          {FEATURES.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </div>

      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
      {showSignUp && <SignUpModal onClose={() => setShowSignUp(false)} />}
    </div>
  );
}
