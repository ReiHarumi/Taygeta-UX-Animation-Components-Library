import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { SweepInput } from "../src";

function Demo() {
  const [name, setName] = useState("Ada Lovelace");
  const [email, setEmail] = useState("");
  const [tuned, setTuned] = useState("");
  const [password, setPassword] = useState("");
  const [long, setLong] = useState(
    "A long value that runs past the edge of the field, so the animated copy has to scroll with the caret",
  );
  const nameRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <div className="field">
        <label htmlFor="name">Name (starts with a value)</label>
        <SweepInput
          ref={nameRef}
          id="name"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button type="button" onClick={() => nameRef.current?.focus()}>
          Focus
        </button>
      </div>
      <div className="field">
        <label htmlFor="email">Email (autofill-friendly)</label>
        <SweepInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="field tuned">
        <label htmlFor="tuned">Tuned with CSS variables (slower, greener)</label>
        <SweepInput
          id="tuned"
          name="tuned"
          placeholder="Try me: emoji and accents like José 👩🏽‍💻"
          value={tuned}
          onChange={(event) => setTuned(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="long">Long value (scrolls with the caret)</label>
        <SweepInput
          id="long"
          name="long"
          value={long}
          onChange={(event) => setLong(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="password">Password (no overlay, never revealed)</label>
        <SweepInput
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<Demo />);
