"use client";

export default function TempleTerminal({
  stdout,
  error,
  moves,
  optimal,
  hasRun,
}: {
  stdout: string;
  error: string | null;
  moves: number;
  optimal: number;
  hasRun: boolean;
}) {
  const body = error
    ? error
    : stdout ||
      (hasRun
        ? "The discs have not reached peg C yet. Review your recursive calls and try again."
        : "Run your solution to hear the temple answer.");

  return (
    <section className="temple-terminal">
      <div className="temple-panel-title">
        <span className="temple-term-label">
          <i className={`temple-term-dot${error ? " is-error" : ""}`} />
          Console
        </span>
        <span className={`temple-console-status${error ? " is-error" : ""}`}>
          {error ? "Error" : hasRun ? "Ready" : "Idle"}
        </span>
      </div>
      <pre className={error ? "is-error" : undefined}>{body}</pre>
      <footer>
        <span>
          moves <b>{moves}</b>
        </span>
        <span>
          optimal <b>{optimal}</b>
        </span>
        <span className="temple-term-sync">timeline synced</span>
      </footer>
    </section>
  );
}
