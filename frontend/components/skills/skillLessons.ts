import type { SkillId } from "./skillsConfig";

export type LessonLanguage = "python" | "java" | "cpp";

export interface SkillLesson {
  summary: string;
  examples: Record<LessonLanguage, string>;
}

export const SKILL_LESSONS: Partial<Record<SkillId, SkillLesson>> = {
  "if-else": {
    summary:
      "Make decisions. Run one block when a condition is true and another when it is false.",
    examples: {
      python: `energy = 40
if energy > 25:
    rover.drive("FRONT")
else:
    rover.charge(20)`,
      java: `int energy = 40;
if (energy > 25) {
    rover.drive("FRONT");
} else {
    rover.charge(20);
}`,
      cpp: `int energy = 40;
if (energy > 25) {
    rover.drive("FRONT");
} else {
    rover.charge(20);
}`,
    },
  },

  "for-loop": {
    summary:
      "Repeat a block a fixed number of times instead of copying the same commands.",
    examples: {
      python: `for i in range(3):
    rover.drive("FRONT")
    rover.drill()`,
      java: `for (int i = 0; i < 3; i++) {
    rover.drive("FRONT");
    rover.drill();
}`,
      cpp: `for (int i = 0; i < 3; i++) {
    rover.drive("FRONT");
    rover.drill();
}`,
    },
  },

  "while-loop": {
    summary: "Repeat a block as long as a condition remains true.",
    examples: {
      python: `steps = 0
while steps < 3:
    rover.drive("FRONT")
    steps += 1`,
      java: `int steps = 0;
while (steps < 3) {
    rover.drive("FRONT");
    steps++;
}`,
      cpp: `int steps = 0;
while (steps < 3) {
    rover.drive("FRONT");
    steps++;
}`,
    },
  },

  "loop-control": {
    summary:
      "break stops a loop early. continue skips the rest of the current repetition.",
    examples: {
      python: `for i in range(10):
    if i == 3:
        break
    rover.drive("FRONT")`,
      java: `for (int i = 0; i < 10; i++) {
    if (i == 3) break;
    rover.drive("FRONT");
}`,
      cpp: `for (int i = 0; i < 10; i++) {
    if (i == 3) break;
    rover.drive("FRONT");
}`,
    },
  },

  automation: {
    summary:
      "Automation puts rover commands inside a loop so one script performs many actions.",
    examples: {
      python: `for i in range(4):
    rover.scan()
    rover.drill()`,
      java: `for (int i = 0; i < 4; i++) {
    rover.scan();
    rover.drill();
}`,
      cpp: `for (int i = 0; i < 4; i++) {
    rover.scan();
    rover.drill();
}`,
    },
  },

  autonomy: {
    summary:
      "Combine conditions and loops so the rover can adapt without step-by-step instructions.",
    examples: {
      python: `for i in range(5):
    if i % 2 == 0:
        rover.scan()
    else:
        rover.drill()`,
      java: `for (int i = 0; i < 5; i++) {
    if (i % 2 == 0) {
        rover.scan();
    } else {
        rover.drill();
    }
}`,
      cpp: `for (int i = 0; i < 5; i++) {
    if (i % 2 == 0) {
        rover.scan();
    } else {
        rover.drill();
    }
}`,
    },
  },

  drive: {
    summary:
      'Move one tile in a direction: FRONT, BACK, LEFT, RIGHT (or NORTH, SOUTH, EAST, WEST).',
    examples: {
      python: `rover.drive("FRONT")`,
      java: `rover.drive("FRONT");`,
      cpp: `rover.drive("FRONT");`,
    },
  },

  drill: {
    summary:
      "Extract minerals from the tile beneath the rover. Drilling costs 15% battery.",
    examples: {
      python: `rover.drill()`,
      java: `rover.drill();`,
      cpp: `rover.drill();`,
    },
  },

  scan: {
    summary:
      "Inspect the current tile before drilling so you know what is underneath.",
    examples: {
      python: `rover.scan()`,
      java: `rover.scan();`,
      cpp: `rover.scan();`,
    },
  },

  turn: {
    summary:
      "Rotate 90° in place. turn_left() is counter-clockwise; turn_right() is clockwise.",
    examples: {
      python: `rover.turn_left()`,
      java: `rover.turnLeft();`,
      cpp: `rover.turn_left();`,
    },
  },

  charge: {
    summary:
      "Recharge the battery when standing on or next to a Charging Station.",
    examples: {
      python: `rover.charge(20)`,
      java: `rover.charge(20);`,
      cpp: `rover.charge(20);`,
    },
  },

  navigator: {
    summary: "Steer around obstacles by combining forward moves with turns.",
    examples: {
      python: `rover.drive("FRONT")
rover.turn_right()
rover.drive("FRONT")`,
      java: `rover.drive("FRONT");
rover.turnRight();
rover.drive("FRONT");`,
      cpp: `rover.drive("FRONT");
rover.turn_right();
rover.drive("FRONT");`,
    },
  },

  surveyor: {
    summary: "Scan first, then drill to recover the mineral vein you found.",
    examples: {
      python: `rover.scan()
rover.drill()`,
      java: `rover.scan();
rover.drill();`,
      cpp: `rover.scan();
rover.drill();`,
    },
  },
};
