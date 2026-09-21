import { useState } from "react";
import { createRoot } from "react-dom/client";
import { SweepInput } from "../src";

function Demo() {
  const [name, setName] = useState("Ada Lovelace");
  const [email, setEmail] = useState("");
  const [tuned, setTuned] = useState("");

  return (
    <>
      <div className="field">
        <label htmlFor="name">Name (starts with a value)</label>
        <SweepInput
          id="name"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
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
    </>
  );
}

createRoot(document.getElementById("root")!).render(<Demo />);
