"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthContext";
import DualCanvasContainer from "@/components/WanderList/DualCanvas/DualCanvasContainer";
import WanderEditor from "@/components/WanderList/IDE/WanderEditor";
import WanderTerminal from "@/components/WanderList/IDE/WanderTerminal";
import WanderToolbar from "@/components/WanderList/WanderToolbar";
import PlaybackControls from "@/components/WanderList/Playback/PlaybackControls";
import { useWanderPlayback } from "@/components/WanderList/Playback/useWanderPlayback";
import { WANDER_LEVELS, type WanderLanguage } from "@/components/WanderList/config/levelsConfig";
import { getWanderListSave, runWanderList, saveWanderList, type WanderRunResult } from "@/lib/api";

const LOCAL_KEY = "wanderlist_save";

export default function WanderListPage() {
  const { token } = useAuth();
  const [level, setLevel] = useState(1);
  const [unlocked, setUnlocked] = useState(1);
  const [stars, setStars] = useState<Record<string, number>>({});
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [language, setLanguage] = useState<WanderLanguage>("python");
  const [showLevels, setShowLevels] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeNode, setActiveNode] = useState(0);
  const [result, setResult] = useState<WanderRunResult | null>(null);
  const current = WANDER_LEVELS[level - 1];
  const playback = useWanderPlayback(result?.timeline.length ?? 0);
  const codeKey = `${level}:${language}`;
  const code = codes[codeKey] ?? codes[String(level)] ?? current.starterCodeByLanguage[language];
  const totalStars = Object.values(stars).reduce((sum, value) => sum + value, 0);
  const visitEvents = result?.timeline.slice(0, playback.index + 1).filter((event) => event.action === "VISIT_NODE") ?? [];
  const activeVisit = visitEvents[visitEvents.length - 1];
  const activeNodeFromTimeline = typeof activeVisit?.node_id === "string"
    ? Math.max(0, Math.min(4, Number(activeVisit.node_id.replace("node_", "")) - 1))
    : activeNode;
  const previousVisit = visitEvents[visitEvents.length - 2];
  const direction = typeof activeVisit?.node_id === "string" && typeof previousVisit?.node_id === "string" &&
    Number(activeVisit.node_id.replace("node_", "")) < Number(previousVisit.node_id.replace("node_", ""))
    ? "backward" as const
    : "forward" as const;

  useEffect(() => {
    let cancelled = false;
    const load = token
      ? getWanderListSave(token).catch(() => null)
      : Promise.resolve(JSON.parse(localStorage.getItem(LOCAL_KEY) || "null"));
    load.then((save) => {
      if (!cancelled && save) {
        setLevel(save.current_level || 1);
        setUnlocked(save.unlocked_levels || 1);
        setStars(save.stars_by_level || {});
        setCodes(save.code_by_level || {});
      }
    });
    return () => { cancelled = true; };
  }, [token]);

  const persist = (nextLevel: number, nextUnlocked: number, nextStars: Record<string, number>, nextCodes: Record<string, string>) => {
    const save = { current_level: nextLevel, unlocked_levels: nextUnlocked, stars_by_level: nextStars, code_by_level: nextCodes };
    localStorage.setItem(LOCAL_KEY, JSON.stringify(save));
    if (token) void saveWanderList(token, save).catch((error) => console.error("Could not save WanderList progress.", error));
  };

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const nextCodes = { ...codes, [codeKey]: code };
      setCodes(nextCodes);
      const next = await runWanderList(level, code, language);
      setResult(next);
      if (next.success) {
        const nextStars = { ...stars, [String(level)]: Math.max(stars[String(level)] || 0, next.stars_earned) };
        const nextUnlocked = Math.max(unlocked, Math.min(16, level + 1));
        setStars(nextStars);
        setUnlocked(nextUnlocked);
        persist(level, nextUnlocked, nextStars, nextCodes);
      } else {
        persist(level, unlocked, stars, nextCodes);
      }
      const visit = next.timeline.findIndex((event) => event.action === "VISIT_NODE");
      setActiveNode(visit >= 0 ? Math.min(4, visit) : 0);
    } catch (error) {
      setResult({ success: false, stars_earned: 0, star_details: { objective: false, optimal_hops: false, in_place_memory: false }, metrics: { pointer_reads: 0, pointer_writes: 0, auxiliary_space_bytes: 0 }, timeline: [], stdout: "", error: error instanceof Error ? error.message : "Could not run your itinerary." });
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setCodes((currentCodes) => ({ ...currentCodes, [codeKey]: current.starterCodeByLanguage[language] }));
    setResult(null);
    setActiveNode(0);
  };

  const selectLevel = (id: number) => {
    if (id <= unlocked) {
      setLevel(id);
      setShowLevels(false);
      setResult(null);
      setActiveNode(0);
    }
  };

  const metrics = useMemo(() => result?.metrics ?? { pointer_reads: 0, pointer_writes: 0 }, [result]);

  return <main className="wander-shell">
    <WanderToolbar level={level} title={current.title} stars={stars[String(level)] || 0} onLevelSelect={() => setShowLevels((value) => !value)} onReset={reset} onRun={run} busy={busy} />
    {showLevels && <section className="wander-level-menu">
      <div className="wander-level-menu-head"><div><small>THE CITY MAP</small><h2>Choose your next stop</h2></div><button type="button" onClick={() => setShowLevels(false)}>×</button></div>
      <div className="wander-level-grid">{WANDER_LEVELS.map((item) => <button type="button" key={item.id} disabled={item.id > unlocked} onClick={() => selectLevel(item.id)} className={item.id === level ? "is-current" : ""}><b>{item.id}</b><span>{item.title}</span><small>{item.id > unlocked ? "🔒 locked" : `${"★".repeat(stars[String(item.id)] || 0)}${"☆".repeat(3 - (stars[String(item.id)] || 0))}`}</small></button>)}</div>
    </section>}
    <div className="wander-page-heading"><div><span className="wander-eyebrow">{current.tier}</span><h1>{current.title}</h1><p>{current.task}</p></div><div className="wander-progress"><strong>{totalStars}</strong><span>/ 48 stars</span></div></div>
    <div className="wander-workspace">
      <div className="wander-canvas-stack"><DualCanvasContainer level={level} activeNode={playback.index > 0 ? activeNodeFromTimeline : activeNode} direction={direction} /><PlaybackControls index={playback.index} length={result?.timeline.length ?? 0} playing={playback.playing} onPlay={playback.play} onPause={playback.pause} onStep={playback.step} onSeek={playback.seek} /></div>
      <aside className="wander-side-panel">
        <WanderEditor language={language} onLanguageChange={setLanguage} code={code} onChange={(value) => setCodes((currentCodes) => ({ ...currentCodes, [codeKey]: value }))} onRun={run} />
        <WanderTerminal stdout={result?.stdout || ""} error={result?.error || null} reads={metrics.pointer_reads} writes={metrics.pointer_writes} />
        <div className="wander-hint"><strong>💡 Pointer tip</strong><p>{current.hint}</p></div>
      </aside>
    </div>
    <footer className="wander-footer"><Link href="/">← Back to game hub</Link><span>WanderList · Linked structures made visible</span></footer>
  </main>;
}
