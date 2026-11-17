"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthContext";
import CallStackPanel from "@/components/Temple/Canvas/CallStackPanel";
import HanoiSpireCanvas from "@/components/Temple/Canvas/HanoiSpireCanvas";
import TempleEditor from "@/components/Temple/IDE/TempleEditor";
import TempleTerminal from "@/components/Temple/IDE/TempleTerminal";
import TemplePlaybackControls from "@/components/Temple/Playback/TemplePlaybackControls";
import StoryDialoguePanel from "@/components/Temple/StoryDialoguePanel";
import TempleRail from "@/components/Temple/TempleRail";
import TempleToolbar from "@/components/Temple/TempleToolbar";
import { useTemplePlayback } from "@/components/Temple/Playback/useTemplePlayback";
import { TEMPLE_LEVELS, type TempleLanguage } from "@/components/Temple/config/levelsConfig";
import { getTempleSave, runTemple, saveTemple, type TempleRunResult } from "@/lib/api";

const LOCAL_KEY = "temple_save";
const MAX_STARS = TEMPLE_LEVELS.length * 3;

export default function TemplePage() {
  const { token } = useAuth();
  const [level, setLevel] = useState(1);
  const [unlocked, setUnlocked] = useState(1);
  const [stars, setStars] = useState<Record<string, number>>({});
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [language, setLanguage] = useState<TempleLanguage>("python");
  const [railOpen, setRailOpen] = useState(false);
  const [showStory, setShowStory] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TempleRunResult | null>(null);
  const current = TEMPLE_LEVELS[level - 1];
  const playback = useTemplePlayback(result?.timeline.length ?? 0, result);
  const codeKey = `${level}:${language}`;
  const code = codes[codeKey] ?? codes[String(level)] ?? current.starterCodeByLanguage[language];
  const totalStars = Object.values(stars).reduce((sum, value) => sum + value, 0);
  const optimal = 2 ** current.disks - 1;
  const metrics = useMemo(
    () => result?.metrics ?? { move_count: 0, instruction_count: 0, disk_count: current.disks },
    [result, current.disks]
  );

  useEffect(() => {
    let cancelled = false;
    const load = token
      ? getTempleSave(token).catch(() => null)
      : Promise.resolve(JSON.parse(localStorage.getItem(LOCAL_KEY) || "null"));
    load.then((save) => {
      if (!cancelled && save) {
        setLevel(save.current_level || 1);
        setUnlocked(save.unlocked_levels || 1);
        setStars(save.stars_by_level || {});
        setCodes(save.code_by_level || {});
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);


  const persist = (
    nextLevel: number,
    nextUnlocked: number,
    nextStars: Record<string, number>,
    nextCodes: Record<string, string>
  ) => {
    const save = {
      current_level: nextLevel,
      unlocked_levels: nextUnlocked,
      stars_by_level: nextStars,
      code_by_level: nextCodes,
    };
    localStorage.setItem(LOCAL_KEY, JSON.stringify(save));
    if (token) {
      void saveTemple(token, save).catch((error) =>
        console.error("Could not save Temple progress.", error)
      );
    }
  };

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const nextCodes = { ...codes, [codeKey]: code };
      setCodes(nextCodes);
      const next = await runTemple(level, code, language);
      setResult(next);
      if (next.success) {
        const nextStars = {
          ...stars,
          [String(level)]: Math.max(stars[String(level)] || 0, next.stars_earned),
        };
        const nextUnlocked = Math.max(unlocked, Math.min(TEMPLE_LEVELS.length, level + 1));
        setStars(nextStars);
        setUnlocked(nextUnlocked);
        persist(level, nextUnlocked, nextStars, nextCodes);
        setShowStory(false);
      } else {
        persist(level, unlocked, stars, nextCodes);
      }
    } catch (error) {
      setResult({
        success: false,
        stars_earned: 0,
        star_details: { objective: false, optimal_moves: false, no_globals: false },
        metrics: { move_count: 0, instruction_count: 0, disk_count: current.disks },
        timeline: [],
        stdout: "",
        error: error instanceof Error ? error.message : "Could not run your submission.",
      });
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setCodes((currentCodes) => ({
      ...currentCodes,
      [codeKey]: current.starterCodeByLanguage[language],
    }));
    setResult(null);
  };

  const selectLevel = (id: number) => {
    if (id <= unlocked) {
      setLevel(id);
      setRailOpen(false);
      setShowStory(true);
      setResult(null);
    }
  };

  return (
    <main className="temple-app">
      <TempleRail
        level={level}
        unlocked={unlocked}
        stars={stars}
        totalStars={totalStars}
        maxStars={MAX_STARS}
        open={railOpen}
        onSelect={selectLevel}
        onClose={() => setRailOpen(false)}
      />

      <div className="temple-main">
        <TempleToolbar
          level={level}
          title={current.title}
          chapter={current.chapter}
          concept={current.concept}
          task={current.task}
          stars={stars[String(level)] || 0}
          onOpenLevels={() => setRailOpen(true)}
          onShowStory={() => setShowStory(true)}
          onReset={reset}
          onRun={run}
          busy={busy}
        />

        <div className="temple-scroll">
          <div className="temple-stage-grid">
            <div className="temple-stage-column">
              <HanoiSpireCanvas
                timeline={result?.timeline ?? []}
                index={playback.index}
                disks={current.disks}
                pegs={current.pegs}
              />
              <TemplePlaybackControls
                index={playback.index}
                length={result?.timeline.length ?? 0}
                playing={playback.playing}
                onPlay={playback.play}
                onPause={playback.pause}
                onStep={playback.step}
                onSeek={playback.seek}
              />
            </div>
            <CallStackPanel
              timeline={result?.timeline ?? []}
              index={playback.index}
              disks={current.disks}
            />
          </div>

          <div className="temple-workbench">
            <TempleEditor
              language={language}
              onLanguageChange={setLanguage}
              code={code}
              onChange={(value) =>
                setCodes((currentCodes) => ({ ...currentCodes, [codeKey]: value }))
              }
              onRun={run}
            />
            <TempleTerminal
              stdout={result?.stdout || ""}
              error={result?.error || null}
              moves={metrics.move_count}
              optimal={optimal}
              hasRun={Boolean(result)}
            />
          </div>

          <div className="temple-notes">
            <section className={`temple-note temple-note--echo${result?.success ? " is-lit" : ""}`}>
              <h3>Echo</h3>
              <p>
                {result?.success
                  ? current.echoDialogue
                  : "The chamber is quiet. Align every disc to hear the echo."}
              </p>
              {result?.success && (
                <div className="temple-star-details">
                  <span className={result.star_details.objective ? "is-earned" : ""}>
                    {"\u2605"} Sacred discs aligned
                  </span>
                  <span className={result.star_details.optimal_moves ? "is-earned" : ""}>
                    {"\u2605"} Ancient efficiency
                  </span>
                  <span className={result.star_details.no_globals ? "is-earned" : ""}>
                    {"\u2605"} Pure recursion
                  </span>
                </div>
              )}
            </section>
            <section className="temple-note temple-note--hint">
              <h3>Hint</h3>
              <p>{current.hint}</p>
            </section>
          </div>
        </div>
      </div>

      {showStory && <StoryDialoguePanel level={current} onStart={() => setShowStory(false)} />}
    </main>
  );
}
