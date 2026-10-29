"use client";

import type { ProfileResult } from "./types";

export default function TestConsole({
  result,
  running,
  evaluation,
}: {
  result: ProfileResult | null;
  running: boolean;
  evaluation: boolean;
}) {
  return (
    <section className="ab-console">
      <div className="ab-console-head">
        <div>
          <span className="ab-console-dot" />
          <strong>Test console</strong>
        </div>
        <span className="ab-console-mode">
          {evaluation ? "final benchmark" : "sample harness"}
        </span>
      </div>

      <div className="ab-console-body">
        {evaluation && (
          <div className="ab-console-state">
            <span className="ab-spinner" />
            <div>
              <strong>Benchmarking both solutions…</strong>
              <p>CPU time, peak memory and asymptotic scaling are being measured.</p>
            </div>
          </div>
        )}

        {!evaluation && running && (
          <div className="ab-console-state">
            <span className="ab-spinner" />
            <div>
              <strong>Running sample tests…</strong>
              <p>The sandbox is compiling and executing your solution.</p>
            </div>
          </div>
        )}

        {!evaluation && !running && !result && (
          <div className="ab-console-empty">
            <span>{">_"}</span>
            <p>Run the sample tests before you lock in your solution.</p>
          </div>
        )}

        {!evaluation && !running && result && (
          <div className="ab-console-result">
            <div className="ab-console-summary">
              <span
                className={`ab-console-verdict ${
                  result.all_passed
                    ? "ab-console-verdict--pass"
                    : "ab-console-verdict--fail"
                }`}
              >
                {result.all_passed ? "ALL SAMPLE TESTS PASSED" : "TESTS FAILED"}
              </span>
              <div className="ab-console-metrics">
                <span>
                  <b>{result.passed_count}</b>/{result.total_count} passed
                </span>
                <span>
                  <b>{result.time_ms.toFixed(2)}</b> ms
                </span>
                <span>
                  <b>{result.memory_kb.toFixed(1)}</b> KB peak
                </span>
              </div>
            </div>

            {result.error && (
              <pre className="ab-console-error">{result.error}</pre>
            )}

            {result.failures.length > 0 && (
              <div className="ab-console-failures">
                {result.failures.map((failure, index) => (
                  <article key={`${failure.label}-${index}`}>
                    <strong>{failure.label}</strong>
                    <div>
                      <span>expected</span>
                      <code>{failure.expected}</code>
                    </div>
                    <div>
                      <span>received</span>
                      <code>{failure.got}</code>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {result.all_passed && (
              <p className="ab-console-ok">
                Sample checks are clean. Stress tests and Big-O scoring run when
                you submit.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
