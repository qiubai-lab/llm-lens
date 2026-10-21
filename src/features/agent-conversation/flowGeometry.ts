import type { Point } from '../../components/flow/geometry';
export { flowCurve, type Point } from '../../components/flow/geometry';

export function toolRails(workspaceRight: number, agentLeft: number, stacked: boolean) {
  return stacked
    ? { execute: workspaceRight + 8, dispatch: 18, result: 30 }
    : { execute: workspaceRight + 12, dispatch: workspaceRight + 44, result: agentLeft - 12 };
}

// Orthogonal internal connections keep both directions outside the Agent's content.
export function elbowRoute(from: Point, to: Point, rail: number) {
  return {
    d: `M ${from.x} ${from.y} L ${rail} ${from.y} L ${rail} ${to.y} L ${to.x} ${to.y}`,
    point(t: number): Point {
      return { x: rail, y: from.y + (to.y - from.y) * t };
    },
  };
}

// Leave below the execution box, then approach the tree row directly from its right.
export function workspaceRoute(from: Point, to: Point, rail: number, escape = 12) {
  const startY = from.y + escape;
  const start = escape ? `M ${from.x} ${from.y} L ${from.x} ${startY}` : `M ${from.x} ${from.y}`;
  return {
    d: `${start} L ${rail} ${startY} L ${rail} ${to.y} L ${to.x} ${to.y}`,
    point(t: number): Point {
      return { x: rail, y: startY + (to.y - startY) * t };
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
