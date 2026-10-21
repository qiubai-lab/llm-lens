import { describe, expect, it } from 'vitest';
import { elbowRoute, flowCurve, placeFlowLabels, toolRails, workspaceRoute } from './flowGeometry';

describe('flow geometry', () => {
  it('separates operation, dispatch and return rails, with operation escaping below all ports', () => {
    const rails = toolRails(300, 412, false);
    expect(rails.execute).toBeLessThan(rails.dispatch);
    expect(rails.dispatch).toBeLessThan(rails.result);
    const stacked = toolRails(240, 40, true);
    expect(stacked.execute).toBeGreaterThan(240);
    expect(new Set(Object.values(stacked)).size).toBe(3);
    const operation = workspaceRoute({ x: 550, y: 800 }, { x: 295, y: 155 }, rails.execute);
    expect(operation.d).toContain('M 550 800 L 550 812');
    expect(operation.point(0).y).toBeGreaterThan(800);
  });
  it('takes the short route to the right of the file without crossing the tree or preview', () => {
    const route = workspaceRoute({ x: 450, y: 720 }, { x: 300, y: 155 }, 312);
    expect(route.d).toBe('M 450 720 L 450 732 L 312 732 L 312 155 L 300 155');
    expect(route.point(0.5)).toEqual({ x: 312, y: 443.5 });
    const stacked = workspaceRoute({ x: 120, y: 720 }, { x: 280, y: 950 }, 288);
    expect(stacked.d.endsWith('L 288 950 L 280 950')).toBe(true);
  });
  it('routes internal Agent connections with straight segments in either direction', () => {
    const from = { x: 300, y: 150 },
      to = { x: 310, y: 700 };
    const rail = 250;
    const route = elbowRoute(from, to, rail);
    expect(route.d).toBe('M 300 150 L 250 150 L 250 700 L 310 700');
    expect(route.point(0.5)).toEqual({ x: rail, y: 425 });
    const reverse = elbowRoute(to, from, rail);
    expect(reverse.d).toBe('M 310 700 L 250 700 L 250 150 L 300 150');
    expect(reverse.point(0.5)).toEqual(route.point(0.5));
  });
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
