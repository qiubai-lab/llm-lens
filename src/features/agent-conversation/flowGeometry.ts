export type Point = { x: number; y: number };

// Horizontal tangents at the endpoints keep the connection smooth regardless
// of where its label is placed.
export function flowCurve(from: Point, to: Point) {
  const middle = (from.x + to.x) / 2;
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

export type FlowLabel = {
  id: string;
  order: number;
  width: number;
  height: number;
  candidates: Point[];
};

export function placeFlowLabels(labels: FlowLabel[]) {
  const placed: (FlowLabel & Point)[] = [];
  const positions = new Map<string, Point>();
  for (const label of [...labels].sort((a, b) => a.order - b.order)) {
    let best = label.candidates[0];
    let bestScore = Infinity;
    for (const [index, point] of label.candidates.entries()) {
      const overlap = placed.reduce((total, other) => {
        const x = Math.max(0, (label.width + other.width) / 2 + 8 - Math.abs(point.x - other.x));
        const y = Math.max(0, (label.height + other.height) / 2 + 8 - Math.abs(point.y - other.y));
        return total + x * y;
      }, 0);
      const score = overlap + index * 0.001;
      if (score < bestScore) {
        best = point;
        bestScore = score;
      }
    }
    if (best) {
      placed.push({ ...label, ...best });
      positions.set(label.id, best);
    }
  }
  return positions;
}
