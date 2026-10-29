"use client";

import dynamic from "next/dynamic";
import { useCallback } from "react";
import type { OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="ab-editor-loading">
      <span className="ab-spinner" />
      Loading combat editor…
    </div>
  ),
});

const THEME = {
  base: "vs-dark" as const,
  inherit: true,
  rules: [
    { token: "comment", foreground: "5c6f82", fontStyle: "italic" },
    { token: "keyword", foreground: "c084fc" },
    { token: "string", foreground: "86efac" },
    { token: "number", foreground: "fbbf24" },
    { token: "type.identifier", foreground: "22d3ee" },
    { token: "delimiter", foreground: "93a4b8" },
  ],
  colors: {
    "editor.background": "#05070c",
    "editor.foreground": "#d7e2f0",
    "editorLineNumber.foreground": "#334155",
    "editorLineNumber.activeForeground": "#7dd3fc",
    "editor.selectionBackground": "#0e3b5b",
    "editor.lineHighlightBackground": "#0a101a",
    "editorCursor.foreground": "#22d3ee",
    "editorIndentGuide.background1": "#132033",
    "editorIndentGuide.activeBackground1": "#23405c",
    "editorWidget.background": "#0b1420",
    "editorWidget.border": "#1e3448",
    "scrollbarSlider.background": "#1e344866",
  },
};

const LANGUAGES = [
  { id: "python", label: "Python 3" },
  { id: "cpp", label: "C++ 17" },
  { id: "java", label: "Java" },
];

const FILE_NAMES: Record<string, string> = {
  python: "solution.py",
  cpp: "solution.cpp",
  java: "Main.java",
};

export default function BattleEditor({
  value,
  onChange,
  language,
  onLanguageChange,
  readOnly,
  running,
  submitted,
  onRun,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  language: string;
  onLanguageChange: (language: string) => void;
  readOnly: boolean;
  running: boolean;
  submitted: boolean;
  onRun: () => void;
  onSubmit: () => void;
}) {
  const handleMount: OnMount = useCallback((instance: editor.IStandaloneCodeEditor, monaco) => {
    monaco.editor.defineTheme("algo-battle", THEME);
    monaco.editor.setTheme("algo-battle");
    instance.focus();
  }, []);

  return (
    <section className="ab-editor">
      <div className="ab-editor-toolbar">
        <div className="ab-editor-file">
          <span className="ab-window-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <strong>{FILE_NAMES[language] ?? "solution.py"}</strong>
          {readOnly && <span className="ab-editor-locked">locked</span>}
        </div>

        <div className="ab-editor-actions">
          <label className="ab-language-select">
            <span className="sr-only">Language</span>
            <select
              value={language}
              onChange={(event) => onLanguageChange(event.target.value)}
              disabled={readOnly || submitted}
            >
              {LANGUAGES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="ab-btn ab-btn--ghost"
            onClick={onRun}
            disabled={readOnly || running}
          >
            {running ? <span className="ab-spinner ab-spinner--small" /> : "▶"}
            Run tests
          </button>

          <button
            type="button"
            className="ab-btn ab-btn--primary"
            onClick={onSubmit}
            disabled={readOnly || submitted}
          >
            {submitted ? "Submitted" : "Submit solution"}
          </button>
        </div>
      </div>

      <div className="ab-editor-surface">
        <MonacoEditor
          height="100%"
          language={language}
          value={value}
          theme="algo-battle"
          onChange={(next) => onChange(next ?? "")}
          onMount={handleMount}
          options={{
            readOnly,
            fontSize: 13.5,
            fontFamily: "'Fira Code', 'Consolas', monospace",
            fontLigatures: true,
            lineNumbers: "on",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 4,
            insertSpaces: true,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: "line",
            occurrencesHighlight: "off",
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
          }}
        />
      </div>
    </section>
  );
}
