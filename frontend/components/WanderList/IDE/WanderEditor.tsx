"use client";

import { useState } from "react";
import type { WanderLanguage } from "../config/levelsConfig";

export default function WanderEditor({ language, code, onLanguageChange, onChange, onRun }: {
  language: WanderLanguage;
  code: string;
  onLanguageChange: (language: WanderLanguage) => void;
  onChange: (value: string) => void;
  onRun: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return <section className={`wander-editor ${focused ? "is-focused" : ""}`}>
    <div className="wander-panel-title">
      <label htmlFor="wander-language">LANGUAGE</label>
      <select id="wander-language" value={language} onChange={(event) => onLanguageChange(event.target.value as WanderLanguage)}>
        <option value="python">🐍 Python</option>
        <option value="java">☕ Java</option>
        <option value="cpp">⚙️ C++</option>
      </select>
      <kbd>Ctrl ↵</kbd>
    </div>
    <textarea
      value={code}
      onChange={(event) => onChange(event.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); onRun(); } }}
      spellCheck={false}
      aria-label="WanderList Python editor"
    />
  </section>;
}
