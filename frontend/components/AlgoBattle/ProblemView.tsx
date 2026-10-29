"use client";

import type { ReactNode } from "react";

import type { BattleProblem } from "./types";

function renderInline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    return <span key={index}>{part}</span>;
  });
}

function paragraphs(text: string) {
  return text
    .split(/\n\n+/)
    .filter(Boolean)
    .map((paragraph, index) => (
      <p key={index}>{renderInline(paragraph)}</p>
    ));
}

export default function ProblemView({ problem }: { problem: BattleProblem }) {
  return (
    <section className="ab-problem">
      <div className="ab-problem-heading">
        <div>
          <span className="ab-eyebrow">MISSION BRIEF</span>
          <h1>{problem.title}</h1>
        </div>
        <span className={`ab-difficulty ab-difficulty--${problem.difficulty.toLowerCase()}`}>
          {problem.difficulty}
        </span>
      </div>

      <div className="ab-tags">
        {problem.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>

      <div className="ab-problem-body">{paragraphs(problem.description)}</div>

      <div className="ab-problem-block">
        <h2>Constraints</h2>
        <pre>{problem.constraints}</pre>
      </div>

      <div className="ab-problem-block">
        <h2>Examples</h2>
        <div className="ab-example-list">
          {problem.examples.map((example, index) => (
            <article key={index} className="ab-example">
              <div className="ab-example-line">
                <span>Input</span>
                <code>{example.input}</code>
              </div>
              <div className="ab-example-line">
                <span>Output</span>
                <code>{example.output}</code>
              </div>
              {example.explanation && (
                <p className="ab-example-note">{example.explanation}</p>
              )}
            </article>
          ))}
        </div>
      </div>

      <div className="ab-problem-block">
        <h2>Sample tests</h2>
        <div className="ab-sample-list">
          {problem.sampleTests.map((test) => (
            <article key={test.label} className="ab-sample">
              <div className="ab-sample-label">{test.label}</div>
              <div className="ab-sample-row">
                <span>in</span>
                <code>{test.input}</code>
              </div>
              <div className="ab-sample-row">
                <span>out</span>
                <code>{test.output}</code>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
