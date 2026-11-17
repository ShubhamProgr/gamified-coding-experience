"use client";

export type TempleEvent = {
  action?: string;
  disk_size?: number;
  from_peg?: string;
  to_peg?: string;
  move_number?: number;
  pegs?: Record<string, number[]>;
};

type Props = {
  timeline: Array<Record<string, unknown>>;
  index: number;
  disks: number;
  pegs: 3 | 4;
};

const VIEW_WIDTH = 760;
const VIEW_HEIGHT = 400;
const BASE_Y = 318;
const POLE_TOP = 74;
const DISK_HEIGHT = 22;
const DISK_STEP = 25;
const DISK_COLORS = ["#d8a13a", "#54b6a3", "#e07a5f", "#7d9cc2", "#a98be0", "#e79ab4"];

function diskWidth(size: number) {
  return 44 + size * 18;
}

function pegPositions(count: number) {
  const left = 160;
  const right = 600;
  if (count <= 1) return [VIEW_WIDTH / 2];
  return Array.from({ length: count }, (_, i) => left + (i * (right - left)) / (count - 1));
}

function buildState(events: TempleEvent[], upTo: number, disks: number, pegCount: number) {
  let initial: Record<string, number[]> | null = null;
  for (const event of events) {
    if (event.action === "INITIAL_STATE" && event.pegs) {
      initial = event.pegs;
      break;
    }
  }
  if (!initial) {
    initial = {};
    for (const pegId of ["A", "B", "C", "D"].slice(0, pegCount)) {
      initial[pegId] = [];
    }
    initial.A = Array.from({ length: disks }, (_, i) => disks - i);
  }
  const state: Record<string, number[]> = {};
  for (const [pegId, sizes] of Object.entries(initial)) {
    state[pegId] = [...sizes];
  }
  const limit = Math.min(upTo, events.length - 1);
  for (let i = 0; i <= limit; i += 1) {
    const event = events[i];
    if (event.action !== "MOVE_DISK") continue;
    if (typeof event.disk_size !== "number") continue;
    const fromPeg = event.from_peg;
    const toPeg = event.to_peg;
    if (typeof fromPeg !== "string" || typeof toPeg !== "string") continue;
    const source = state[fromPeg];
    const target = state[toPeg];
    if (!source || !target) continue;
    const at = source.lastIndexOf(event.disk_size);
    if (at === -1) continue;
    source.splice(at, 1);
    target.push(event.disk_size);
  }
  return state;
}

export default function HanoiSpireCanvas({ timeline, index, disks, pegs }: Props) {
  const events = timeline as TempleEvent[];
  const positions = pegPositions(pegs);
  const pegX: Record<string, number> = { A: positions[0], B: positions[1], C: positions[2] };
  if (pegs === 4) pegX.D = positions[3];

  const state = buildState(events, index, disks, pegs);
  const pegOrder = ["A", "B", "C", "D"].slice(0, pegs);

  let lastMove: TempleEvent | null = null;
  let moveCount = 0;
  const limit = Math.min(index, events.length - 1);
  for (let i = 0; i <= limit; i += 1) {
    if (events[i]?.action === "MOVE_DISK") {
      lastMove = events[i];
      moveCount += 1;
    }
  }
  const optimal = 2 ** disks - 1;
  const totalMoves = events.filter((event) => event.action === "MOVE_DISK").length;

  return (
    <section className="temple-stage">
      <div className="temple-stage-head">
        <div className="temple-stage-title">
          <span>Spire board</span>
          <small>Move every disc from A to C</small>
        </div>
        <div className="temple-stage-stats">
          <span>
            moves <b>{moveCount}</b>
          </span>
          <span>
            optimal <b>{optimal}</b>
          </span>
          {totalMoves > 0 && <span className="is-live">live</span>}
        </div>
      </div>
      <svg
        className="temple-stage-svg"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        role="img"
        aria-label={`Hanoi board with ${disks} disks on ${pegs} pegs`}
      >
        <defs>
          <linearGradient id="temple-base" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2b4a42" />
            <stop offset="100%" stopColor="#132622" />
          </linearGradient>
          <linearGradient id="temple-pole" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a9b9b2" />
            <stop offset="45%" stopColor="#eef3ef" />
            <stop offset="100%" stopColor="#8fa39b" />
          </linearGradient>
          <pattern id="temple-grid" width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.5" fill="#d9d3c4" />
          </pattern>
          <filter id="temple-disk-shadow" x="-20%" y="-40%" width="140%" height="180%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="2.2" floodColor="#0e1b18" floodOpacity="0.22" />
          </filter>
        </defs>

        <rect x="28" y="18" width="704" height={BASE_Y - 18} rx="22" fill="url(#temple-grid)" opacity="0.55" />
        <rect x="58" y={BASE_Y} width="644" height="20" rx="10" fill="url(#temple-base)" />
        <rect x="58" y={BASE_Y} width="644" height="4" rx="2" fill="#ffffff" opacity="0.16" />

        {pegOrder.map((pegId, pegIndex) => {
          const x = pegX[pegId];
          const role = pegIndex === 0 ? "source" : pegIndex === pegOrder.length - 1 ? "target" : "aux";
          return (
            <g key={pegId}>
              <rect
                x={x - 4}
                y={POLE_TOP}
                width="8"
                height={BASE_Y - POLE_TOP}
                rx="4"
                fill="url(#temple-pole)"
              />
              <circle cx={x} cy={POLE_TOP} r="7" fill="#d8a13a" />
              <circle cx={x} cy={POLE_TOP} r="3" fill="#fff7e6" opacity="0.65" />
              <text x={x} y={BASE_Y + 46} textAnchor="middle" className="temple-peg-label">
                {pegId}
              </text>
              <text x={x} y={BASE_Y + 62} textAnchor="middle" className="temple-peg-role">
                {role}
              </text>
            </g>
          );
        })}

        {pegOrder.flatMap((pegId) =>
          (state[pegId] || []).map((size, stackIndex) => {
            const width = diskWidth(size);
            const x = pegX[pegId] - width / 2;
            const y = BASE_Y - stackIndex * DISK_STEP - DISK_HEIGHT;
            return (
              <g
                key={`disk-${size}`}
                className="temple-disk"
                style={{ transform: `translate(${x}px, ${y}px)` }}
              >
                <rect
                  width={width}
                  height={DISK_HEIGHT}
                  rx="8"
                  fill={DISK_COLORS[(size - 1) % DISK_COLORS.length]}
                  filter="url(#temple-disk-shadow)"
                />
                <rect width={width} height="6" rx="3" fill="#ffffff" opacity="0.32" />
                <text
                  x={width / 2}
                  y={DISK_HEIGHT / 2 + 4}
                  textAnchor="middle"
                  className="temple-disk-label"
                >
                  {size}
                </text>
              </g>
            );
          })
        )}

        {lastMove && (
          <g className="temple-move-chip">
            <rect x="44" y="36" width="170" height="30" rx="15" fill="#ffffff" opacity="0.9" />
            <text x="60" y="56" className="temple-move-caption">
              disk {lastMove.disk_size}: {lastMove.from_peg} {"\u2192"} {lastMove.to_peg}
            </text>
          </g>
        )}
      </svg>
    </section>
  );
}
