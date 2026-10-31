"use client";

export default function WanderTerminal({ stdout, error, reads, writes }: { stdout: string; error: string | null; reads: number; writes: number }) {
  return <section className="wander-terminal">
    <div className="wander-panel-title"><span>▣ MISSION CONSOLE</span><span className="wander-console-status">{error ? "ATTENTION" : "READY"}</span></div>
    <pre>{error ? `Traceback (most recent call last):\n\n${error}\n\nTip: check your None guards before following a pointer.` : stdout || "Run your itinerary to see pointer activity here."}</pre>
    <footer><span>reads <b>{reads}</b></span><span>writes <b>{writes}</b></span><span>timeline synced</span></footer>
  </section>;
}
