"use client";

import { useRef, useState } from "react";
import type { TempleLanguage } from "../config/levelsConfig";

export default function TempleEditor({
  language,
  code,
  onLanguageChange,
  onChange,
  onRun,
}: {
  language: TempleLanguage;
  code: string;
  onLanguageChange: (language: TempleLanguage) => void;
  onChange: (value: string) => void;
  onRun: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const gutterRef = useRef<HTMLDivElement>(null);
  const lineCount = code.split("\n").length;

  return (
    <section className={`temple-editor${focused ? " is-focused" : ""}`}>
      <div className="temple-panel-title">
        <label htmlFor="temple-language">Code</label>
        <select
          id="temple-language"
          value={language}
          onChange={(event) => onLanguageChange(event.target.value as TempleLanguage)}
        >
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
        </select>
        <kbd>Ctrl + Enter</kbd>
      </div>
      <div className="temple-editor-body">
        <div className="temple-editor-gutter" ref={gutterRef} aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        <textarea
          value={code}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onScroll={(event) => {
            if (gutterRef.current) {
              gutterRef.current.scrollTop = event.currentTarget.scrollTop;
            }
          }}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              onRun();
            }
          }}
          spellCheck={false}
          aria-label="Temple of Echoes code editor"
        />
      </div>
    </section>
  );
}
