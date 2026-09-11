"use client";

import { useRef, useCallback } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type { editor, languages, Position } from "monaco-editor";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
}

const STARTER_CODE = `# Sector 3x3 Survey Mission (type /help in Terminal for SDK reference)
rover.drive("NORTH")
rover.scan()
rover.drill()
rover.drill()

rover.drive("EAST")
rover.drive("SOUTH")
rover.scan()
rover.drill()
`;

export const DEFAULT_CODE = STARTER_CODE;

// Custom Monaco theme matching the Mars/space palette
const MARS_THEME: editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment",        foreground: "556677", fontStyle: "italic" },
    { token: "keyword",        foreground: "cc88ff" },
    { token: "string",         foreground: "a8d8a8" },
    { token: "number",         foreground: "ffb700" },
    { token: "identifier",     foreground: "c9d1d9" },
    { token: "type.identifier",foreground: "00d4ff" },
    { token: "delimiter",      foreground: "8899aa" },
    { token: "operator",       foreground: "e8631a" },
  ],
  colors: {
    "editor.background":           "#0d1117",
    "editor.foreground":           "#c9d1d9",
    "editorLineNumber.foreground": "#3d4f61",
    "editorLineNumber.activeForeground": "#6a8aa8",
    "editor.selectionBackground":  "#1e3a5f",
    "editor.lineHighlightBackground": "#111827",
    "editorCursor.foreground":     "#00d4ff",
    "editorIndentGuide.background1": "#1e2d42",
    "editorIndentGuide.activeBackground1": "#2a4a6a",
    "editor.findMatchBackground":  "#c1440e55",
    "editor.findMatchHighlightBackground": "#e8631a33",
    "editorWidget.background":     "#161f2e",
    "editorWidget.border":         "#1e2d42",
    "input.background":            "#111827",
    "input.foreground":            "#e8edf5",
    "input.border":                "#1e2d42",
    "scrollbarSlider.background":  "#1e2d4288",
    "scrollbarSlider.hoverBackground": "#2a4a6a88",
  },
};

export default function CodeEditor({
  value,
  onChange,
  language = "python",
  readOnly = false,
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleMount: OnMount = useCallback((ed, monaco) => {
    editorRef.current = ed;

    // Register custom theme
    monaco.editor.defineTheme("mars-dark", MARS_THEME);
    monaco.editor.setTheme("mars-dark");

    // Python-specific autocomplete for rover SDK
    if (language === "python") {
      monaco.languages.registerCompletionItemProvider("python", {
        triggerCharacters: ["."],
        provideCompletionItems(model: editor.ITextModel, position: Position) {
          const lineText = model.getLineContent(position.lineNumber);
          const wordBefore = lineText.slice(0, position.column - 1);

          if (!wordBefore.trimEnd().endsWith("rover")) {
            return { suggestions: [] };
          }

          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column,
          };

          const mkSnippet = (
            label: string,
            insertText: string,
            detail: string
          ): languages.CompletionItem => ({
            label,
            kind: monaco.languages.CompletionItemKind.Method,
            insertText,
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail,
            documentation: detail,
            range,
          } as languages.CompletionItem);

          return {
            suggestions: [
              mkSnippet('drive("NORTH")', 'drive("${1|NORTH,SOUTH,EAST,WEST|}")', "Move one tile in a cardinal direction"),
              mkSnippet("drill()", "drill()", "Engage core drill to extract minerals & core samples"),
              mkSnippet("scan()", "scan()", "Analyze subsurface mineral composition & reserves"),
              mkSnippet("charge()", "charge(${1:10})", "Recharge battery (needs solar tile)"),
              mkSnippet("turn_left()", "turn_left()", "Rotate rover 90° left"),
              mkSnippet("turn_right()", "turn_right()", "Rotate rover 90° right"),
              mkSnippet("get_position()", "get_position()", "Returns current grid position"),
              mkSnippet('log("message")', 'log("${1:message}")', "Print a custom log message"),
            ],
          };
        },
      });
    }

    // Focus editor on mount
    ed.focus();
  }, [language]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Editor
        height="100%"
        language={language}
        value={value}
        theme="mars-dark"
        onChange={(val) => onChange(val ?? "")}
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
          renderWhitespace: "none",
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
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false,
          },
        }}
        loading={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--text-muted)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              gap: 10,
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                border: "2px solid var(--space-border-glow)",
                borderTopColor: "var(--glow-cyan)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            Loading editor…
          </div>
        }
      />
    </div>
  );
}
