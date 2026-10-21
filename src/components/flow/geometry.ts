export type Point = { x: number; y: number };

// Horizontal tangents at the endpoints keep the connection smooth regardless
// of where its label is placed.
export function flowCurve(from: Point, to: Point, middle = (from.x + to.x) / 2) {
  return {
    d: `M ${from.x} ${from.y} C ${middle} ${from.y}, ${middle} ${to.y}, ${to.x} ${to.y}`,
    point(t: number): Point {
      const u = 1 - t;
      return {
        x: u ** 3 * from.x + 3 * u * t * middle + t ** 3 * to.x,
        y: (u ** 3 + 3 * u ** 2 * t) * from.y + (3 * u * t ** 2 + t ** 3) * to.y,
      };
    },
  };
}
