export type SkillId =
  | "root"
  | "branch-control"
  | "branch-rover"
  | "if-else"
  | "for-loop"
  | "while-loop"
  | "loop-control"
  | "automation"
  | "autonomy"
  | "drive"
  | "drill"
  | "scan"
  | "turn"
  | "charge"
  | "surveyor"
  | "navigator";

export type NodeKind = "root" | "branch" | "skill";

export interface SkillNode {
  id: SkillId;
  name: string;
  icon: string;
  hint: string;
  kind: NodeKind;
  parent: SkillId | null;
  x: number;
  y: number;
  detect?: (clean: string) => boolean;
}

const ROVER_CALL =
  /\brover\s*\.\s*(?:drive|drill|scan|turn_left|turn_right|charge)\s*\(/;
const DRIVE_CALL = /\brover\s*\.\s*drive\s*\(/;
const DRILL_CALL = /\brover\s*\.\s*drill\s*\(/;
const SCAN_CALL = /\brover\s*\.\s*scan\s*\(/;
const TURN_CALL = /\brover\s*\.\s*(?:turn_left|turn_right)\s*\(/;
const CHARGE_CALL = /\brover\s*\.\s*charge\s*\(/;
const IF_CALL = /\b(?:if|elif)\b/;
const FOR_CALL = /\bfor\b/;
const WHILE_CALL = /\bwhile\b/;
const LOOP_CONTROL = /\b(?:break|continue)\b/;

export const SKILL_NODES: SkillNode[] = [
  {
    id: "root",
    name: "Rover Cadet",
    icon: "🚀",
    hint: "Mission control online.",
    kind: "root",
    parent: null,
    x: 20,
    y: 360,
  },

  // ── Control flow branch ────────────────────────────────────────────────
  {
    id: "branch-control",
    name: "Control Flow",
    icon: "🧠",
    hint: "Teach the rover to make decisions.",
    kind: "branch",
    parent: "root",
    x: 250,
    y: 110,
  },
  {
    id: "if-else",
    name: "If / Else",
    icon: "🔀",
    hint: "Run code that uses an if statement.",
    kind: "skill",
    parent: "branch-control",
    x: 470,
    y: 20,
    detect: (clean) => IF_CALL.test(clean),
  },
  {
    id: "for-loop",
    name: "For Loop",
    icon: "🔁",
    hint: "Run code that uses a for loop.",
    kind: "skill",
    parent: "branch-control",
    x: 470,
    y: 120,
    detect: (clean) => FOR_CALL.test(clean),
  },
  {
    id: "while-loop",
    name: "While Loop",
    icon: "🌀",
    hint: "Run code that uses a while loop.",
    kind: "skill",
    parent: "branch-control",
    x: 470,
    y: 220,
    detect: (clean) => WHILE_CALL.test(clean),
  },
  {
    id: "loop-control",
    name: "Loop Control",
    icon: "⏭️",
    hint: "Use break or continue inside a loop.",
    kind: "skill",
    parent: "for-loop",
    x: 730,
    y: 70,
    detect: (clean) => LOOP_CONTROL.test(clean),
  },
  {
    id: "automation",
    name: "Automation",
    icon: "⚙️",
    hint: "Put rover commands inside a loop.",
    kind: "skill",
    parent: "for-loop",
    x: 730,
    y: 190,
    detect: (clean) =>
      (FOR_CALL.test(clean) || WHILE_CALL.test(clean)) && ROVER_CALL.test(clean),
  },
  {
    id: "autonomy",
    name: "Autonomy",
    icon: "🛰️",
    hint: "Combine an if, a loop, and a rover command.",
    kind: "skill",
    parent: "automation",
    x: 990,
    y: 190,
    detect: (clean) =>
      IF_CALL.test(clean) &&
      (FOR_CALL.test(clean) || WHILE_CALL.test(clean)) &&
      ROVER_CALL.test(clean),
  },

  // ── Rover operations branch ────────────────────────────────────────────
  {
    id: "branch-rover",
    name: "Rover Ops",
    icon: "🛠️",
    hint: "Master the rover's onboard tools.",
    kind: "branch",
    parent: "root",
    x: 250,
    y: 560,
  },
  {
    id: "drive",
    name: "Drive",
    icon: "🛞",
    hint: "Call rover.drive().",
    kind: "skill",
    parent: "branch-rover",
    x: 470,
    y: 390,
    detect: (clean) => DRIVE_CALL.test(clean),
  },
  {
    id: "drill",
    name: "Drill",
    icon: "⛏️",
    hint: "Call rover.drill().",
    kind: "skill",
    parent: "branch-rover",
    x: 470,
    y: 480,
    detect: (clean) => DRILL_CALL.test(clean),
  },
  {
    id: "scan",
    name: "Scan",
    icon: "🔬",
    hint: "Call rover.scan().",
    kind: "skill",
    parent: "branch-rover",
    x: 470,
    y: 570,
    detect: (clean) => SCAN_CALL.test(clean),
  },
  {
    id: "turn",
    name: "Turn",
    icon: "🔄",
    hint: "Call rover.turn_left() or turn_right().",
    kind: "skill",
    parent: "branch-rover",
    x: 470,
    y: 660,
    detect: (clean) => TURN_CALL.test(clean),
  },
  {
    id: "charge",
    name: "Charge",
    icon: "🔋",
    hint: "Call rover.charge().",
    kind: "skill",
    parent: "branch-rover",
    x: 470,
    y: 750,
    detect: (clean) => CHARGE_CALL.test(clean),
  },
  {
    id: "navigator",
    name: "Navigator",
    icon: "🧭",
    hint: "Combine drive and turn in one run.",
    kind: "skill",
    parent: "drive",
    x: 730,
    y: 390,
    detect: (clean) => DRIVE_CALL.test(clean) && TURN_CALL.test(clean),
  },
  {
    id: "surveyor",
    name: "Surveyor",
    icon: "🗺️",
    hint: "Combine scan and drill in one run.",
    kind: "skill",
    parent: "scan",
    x: 730,
    y: 570,
    detect: (clean) => SCAN_CALL.test(clean) && DRILL_CALL.test(clean),
  },
];

export const SKILL_MAP: Record<SkillId, SkillNode> = SKILL_NODES.reduce(
  (acc, node) => ({ ...acc, [node.id]: node }),
  {} as Record<SkillId, SkillNode>
);

export const UNLOCKABLE_SKILLS = SKILL_NODES.filter(
  (node) => node.kind === "skill"
);

export const MASTERY_TARGET = 200;

function stripCommentsAndStrings(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/#[^\n]*/g, " ")
    .replace(/"""[\s\S]*?"""/g, " ")
    .replace(/'''[\s\S]*?'''/g, " ")
    .replace(/"(?:\\.|[^"\\])*"/g, " ")
    .replace(/'(?:\\.|[^'\\])*'/g, " ");
}

export function detectSkills(code: string): SkillId[] {
  const clean = stripCommentsAndStrings(code);
  return UNLOCKABLE_SKILLS.filter((node) => node.detect?.(clean)).map(
    (node) => node.id
  );
}

export function getRecommendedNextSkill(
  newSkills: SkillId[],
  unlockedAfter: SkillId[]
): SkillNode | null {
  const locked = UNLOCKABLE_SKILLS.filter(
    (node) => !unlockedAfter.includes(node.id)
  );

  // Prefer a child of the most advanced skill unlocked by this run.
  for (let i = newSkills.length - 1; i >= 0; i--) {
    const child = locked.find((node) => node.parent === newSkills[i]);
    if (child) return child;
  }

  // Otherwise suggest the next locked skill in the same branch.
  for (const id of newSkills) {
    const branch = SKILL_MAP[id]?.parent;
    if (!branch) continue;
    const sibling = locked.find((node) => node.parent === branch);
    if (sibling) return sibling;
  }

  // Fall back to any skill whose parent is already unlocked.
  return (
    locked.find((node) => {
      const parent = node.parent ? SKILL_MAP[node.parent] : null;
      return (
        !parent || parent.kind !== "skill" || unlockedAfter.includes(parent.id)
      );
    }) ?? null
  );
}

export function isSkillId(value: unknown): value is SkillId {
  return UNLOCKABLE_SKILLS.some((node) => node.id === value);
}
