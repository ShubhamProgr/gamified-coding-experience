export type TempleLanguage = "python" | "java" | "cpp";

export type TempleChapter =
  | "Entry Chamber"
  | "Mirror Halls"
  | "Cursed Vaults"
  | "The Ascension";

export type TempleLevel = {
  id: number;
  chapter: TempleChapter;
  title: string;
  story: string;
  echoDialogue: string;
  task: string;
  hint: string;
  concept: string;
  disks: number;
  pegs: 3 | 4;
  starterCodeByLanguage: Record<TempleLanguage, string>;
};

const starters = (python: string, java: string, cpp: string) => ({
  python,
  java,
  cpp,
});

const pyBase = `def hanoi(n, source, aux, target):
    if n == 1:
        disk = source.pop()
        target.push(disk)
        return
`;

const pySkeleton = `def hanoi(n, source, aux, target):
    if n == 0:
        return
    # Move the top n - 1 disks, move the largest disk, then move them back.
    # YOUR CODE HERE
    pass
`;

const pyBroken = `def hanoi(n, source, aux, target):
    hanoi(n - 1, source, target, aux)
    target.push(source.pop())
    hanoi(n - 1, aux, source, target)
`;

const pyWrongPeg = `def hanoi(n, source, aux, target):
    if n == 0:
        return
    hanoi(n - 1, source, target, aux)
    source.push(target.pop())
    hanoi(n - 1, aux, source, target)
`;

const javaBase = `static void hanoi(int n, Peg source, Peg aux, Peg target) {
    if (n == 1) {
        Disk disk = source.pop();
        target.push(disk);
        return;
    }
}`;

const javaSkeleton = `static void hanoi(int n, Peg source, Peg aux, Peg target) {
    if (n == 0) {
        return;
    }
    // YOUR CODE HERE
}`;

const javaBroken = `static void hanoi(int n, Peg source, Peg aux, Peg target) {
    hanoi(n - 1, source, target, aux);
    Disk disk = source.pop();
    target.push(disk);
    hanoi(n - 1, aux, source, target);
}`;

const javaWrongPeg = `static void hanoi(int n, Peg source, Peg aux, Peg target) {
    if (n == 0) {
        return;
    }
    hanoi(n - 1, source, target, aux);
    Disk disk = target.pop();
    source.push(disk);
    hanoi(n - 1, aux, source, target);
}`;

const cppBase = `void hanoi(int n, Peg& source, Peg& aux, Peg& target) {
    if (n == 1) {
        Disk disk = source.pop();
        target.push(disk);
        return;
    }
}`;

const cppSkeleton = `void hanoi(int n, Peg& source, Peg& aux, Peg& target) {
    if (n == 0) {
        return;
    }
    // YOUR CODE HERE
}`;

const cppBroken = `void hanoi(int n, Peg& source, Peg& aux, Peg& target) {
    hanoi(n - 1, source, target, aux);
    Disk disk = source.pop();
    target.push(disk);
    hanoi(n - 1, aux, source, target);
}`;

const cppWrongPeg = `void hanoi(int n, Peg& source, Peg& aux, Peg& target) {
    if (n == 0) {
        return;
    }
    hanoi(n - 1, source, target, aux);
    Disk disk = target.pop();
    source.push(disk);
    hanoi(n - 1, aux, source, target);
}`;

export const TEMPLE_LEVELS: TempleLevel[] = [
  {
    id: 1,
    chapter: "Entry Chamber",
    title: "The First Stone",
    story:
      "Kira steps into a dimly lit antechamber. A single glowing disc rests on the left spire. The ancient spirit Echo whispers: \"Move it, child. This one is easy.\"",
    echoDialogue: "\"One step. That is all a base case ever asks of you.\"",
    task: "Move 1 disk from peg A to peg C.",
    hint: "When n == 1, simply pop from source and push to target.",
    concept: "Base Case",
    disks: 1,
    pegs: 3,
    starterCodeByLanguage: starters(pyBase, javaBase, cppBase),
  },
  {
    id: 2,
    chapter: "Entry Chamber",
    title: "Echoes of Two",
    story:
      "A second, heavier disc materializes beneath the first. \"You cannot simply lift,\" Echo warns. \"You must think ahead.\"",
    echoDialogue: "\"Two calls. One small, one large. The rhythm of recursion begins.\"",
    task: "Move 2 disks from peg A to peg C.",
    hint: "Move the small disk to the auxiliary peg, the large disk to the target, then the small disk onto the target.",
    concept: "First Recursive Call",
    disks: 2,
    pegs: 3,
    starterCodeByLanguage: starters(pySkeleton, javaSkeleton, cppSkeleton),
  },
  {
    id: 3,
    chapter: "Entry Chamber",
    title: "The Triad",
    story:
      "The sealed door ahead requires all three discs realigned. The floor rumbles as the temple tests your footing.",
    echoDialogue: "\"Three discs. Seven moves. You have found the pattern.\"",
    task: "Move 3 disks from peg A to peg C.",
    hint: "Trust the recursion: solve n - 1, move one disk, then solve n - 1 again.",
    concept: "Full Recursion",
    disks: 3,
    pegs: 3,
    starterCodeByLanguage: starters(pySkeleton, javaSkeleton, cppSkeleton),
  },
  {
    id: 4,
    chapter: "Mirror Halls",
    title: "The Deeper Chamber",
    story:
      "Kira descends a staircase. Each step is a glowing stack frame etched into the wall, waiting to unwind.",
    echoDialogue: "\"Every descent is a promise. Every return keeps it.\"",
    task: "Move 3 disks from peg A to peg C.",
    hint: "Watch the call stack as the deepest frame returns first.",
    concept: "Call Stack",
    disks: 3,
    pegs: 3,
    starterCodeByLanguage: starters(pySkeleton, javaSkeleton, cppSkeleton),
  },
  {
    id: 5,
    chapter: "Mirror Halls",
    title: "The Weight of History",
    story:
      "Four discs, ancient and heavy, rest on the spire. Echo whispers: \"Fifteen moves. No more, no less.\"",
    echoDialogue: "\"Deeper stacks take longer, but the base case never changes.\"",
    task: "Move 4 disks from peg A to peg C.",
    hint: "Each extra disk doubles the work and adds one move. 2^4 - 1 = 15.",
    concept: "Stack Depth",
    disks: 4,
    pegs: 3,
    starterCodeByLanguage: starters(pySkeleton, javaSkeleton, cppSkeleton),
  },
  {
    id: 6,
    chapter: "Mirror Halls",
    title: "The Infinite Corridor",
    story:
      "Kira finds a corrupted inscription: a recursion with no base case. The corridor loops forever, and the walls begin to close.",
    echoDialogue: "\"Every recursion needs a floor. Without one, you fall forever.\"",
    task: "Fix the broken recursion so 3 disks reach peg C.",
    hint: "Add the missing base case: when n == 0, return immediately.",
    concept: "Base Case Fix",
    disks: 3,
    pegs: 3,
    starterCodeByLanguage: starters(pyBroken, javaBroken, cppBroken),
  },
  {
    id: 7,
    chapter: "Cursed Vaults",
    title: "The Branching Path",
    story:
      "The mural shows 2^4 - 1 = 15 ancient monk footprints. Kira counts each step as the vault doors groan open.",
    echoDialogue: "\"Each call branches twice. The tree grows, but the path is known.\"",
    task: "Move 4 disks from peg A to peg C.",
    hint: "The optimal number of moves is 2^n - 1. Do not move a disk twice unnecessarily.",
    concept: "Branching",
    disks: 4,
    pegs: 3,
    starterCodeByLanguage: starters(pySkeleton, javaSkeleton, cppSkeleton),
  },
  {
    id: 8,
    chapter: "Cursed Vaults",
    title: "The Phantom Peg",
    story:
      "A ghostly rod flickers beside the spires. \"Use the auxiliary rod as your memory,\" Echo says. \"Let it hold what you cannot.\"",
    echoDialogue: "\"The auxiliary peg is not a detour. It is part of the plan.\"",
    task: "Move 5 disks from peg A to peg C.",
    hint: "Recursive calls return to the same problem, one disk smaller.",
    concept: "Auxiliary Memory",
    disks: 5,
    pegs: 3,
    starterCodeByLanguage: starters(pySkeleton, javaSkeleton, cppSkeleton),
  },
  {
    id: 9,
    chapter: "Cursed Vaults",
    title: "The Cursed Mirror",
    story:
      "A twisted mirror shows a version of your solution moving discs the wrong way. The reflection is close, but not quite right.",
    echoDialogue: "\"The mirror reverses your intent. Find the single line that lies.\"",
    task: "Fix the mirrored solution so 3 disks reach peg C.",
    hint: "A disk must travel from source to target. Check the direction of the move.",
    concept: "Debugging",
    disks: 3,
    pegs: 3,
    starterCodeByLanguage: starters(pyWrongPeg, javaWrongPeg, cppWrongPeg),
  },
  {
    id: 10,
    chapter: "The Ascension",
    title: "The Fourth Spire",
    story:
      "A hidden fourth spire rises from the floor, cracking the stone. Fewer moves are possible now, if you can see the new path.",
    echoDialogue: "\"A new branch appears. Great power is choosing which branch to take.\"",
    task: "Move 4 disks from peg A to peg C. A fourth spire, D, is available.",
    hint: "You may reference the fourth peg D directly. Fewer moves are possible with four pegs.",
    concept: "Four Pegs",
    disks: 4,
    pegs: 4,
    starterCodeByLanguage: starters(pySkeleton, javaSkeleton, cppSkeleton),
  },
  {
    id: 11,
    chapter: "The Ascension",
    title: "The Grand Sequence",
    story:
      "Every disc must move in the minimum number of steps, or the ceiling collapses. Kira steadies her hands.",
    echoDialogue: "\"Efficiency is a form of respect for the ancient stones.\"",
    task: "Move 5 disks from peg A to peg C using the minimum number of moves.",
    hint: "The classic recursive solution is optimal here: 2^5 - 1 = 31 moves.",
    concept: "Optimality",
    disks: 5,
    pegs: 4,
    starterCodeByLanguage: starters(pySkeleton, javaSkeleton, cppSkeleton),
  },
  {
    id: 12,
    chapter: "The Ascension",
    title: "The Final Echo",
    story:
      "Kira reaches the summit. All six discs, three spires. The temple holds its breath.",
    echoDialogue: "\"You did not move the stones. You moved the idea of them. The temple remembers.\"",
    task: "Move 6 disks from peg A to peg C.",
    hint: "You have solved this before. Trust the base case and the recursive leap of faith.",
    concept: "Synthesis",
    disks: 6,
    pegs: 3,
    starterCodeByLanguage: starters(pySkeleton, javaSkeleton, cppSkeleton),
  },
];

export const TEMPLE_CHAPTERS: Record<TempleChapter, number[]> = {
  "Entry Chamber": [1, 2, 3],
  "Mirror Halls": [4, 5, 6],
  "Cursed Vaults": [7, 8, 9],
  "The Ascension": [10, 11, 12],
};
