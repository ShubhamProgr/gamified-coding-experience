export const GRID_SIZE = 15;

// Center of the 15×15 grid (floor(GRID_SIZE / 2)).
export const START_CELL = { col: 7, row: 7 } as const;

// Irregular, asymmetric landmass — a jagged continent with a northern spur,
// a long western arm, an eastern headland, and a southern tail. Internal
// chokepoints and pockets keep navigation interesting without making the
// overall silhouette circular. 0 = void (impassable abyss), 1 = walkable.
export const MAP_MASK = [
  [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0],
  [0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0],
  [1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0],
  [0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
];
