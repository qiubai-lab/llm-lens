import { describe, expect, it } from 'vitest';
import { flowCurve, placeFlowLabels } from './flowGeometry';

describe('flow geometry', () => {
  it('keeps both travel directions on one smooth curve with the same midpoint', () => {
    const a = { x: 0, y: 30 },
      b = { x: 112, y: 210 };
    const forward = flowCurve(a, b),
      backward = flowCurve(b, a);
    expect(forward.point(0)).toEqual(a);
    expect(forward.point(1)).toEqual(b);
    expect(forward.point(0.5)).toEqual({ x: 56, y: 120 });
    expect(backward.point(0.5)).toEqual(forward.point(0.5));
    expect(forward.d.match(/C/g)).toHaveLength(1);
  });

  it('moves colliding labels along available points while retaining sequence priority', () => {
    const first = { id: 'first', order: 1, width: 92, height: 26, candidates: [{ x: 56, y: 120 }] };
    const second = {
      id: 'second',
      order: 2,
      width: 92,
      height: 26,
      candidates: [
        { x: 56, y: 120 },
        { x: 50, y: 160 },
      ],
    };
    const placed = placeFlowLabels([second, first]);
    expect(placed.get('first')).toEqual(first.candidates[0]);
    expect(placed.get('second')).toEqual(second.candidates[1]);
    expect(placeFlowLabels([second]).get('second')).toEqual(second.candidates[0]);
  });
});
