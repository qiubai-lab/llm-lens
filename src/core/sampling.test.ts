import { describe, expect, it } from 'vitest';
import { distribution, sample, randomAt, defaults } from './sampling';
import { candidatesFor, examples } from './lesson';
const candidates = [
  { word: '甲', logit: Math.log(0.5) },
  { word: '乙', logit: Math.log(0.3) },
  { word: '丙', logit: Math.log(0.2) },
];
describe('AC-003: 采样概率与边界', () => {
  it('温度为 1 时还原分布，概率之和为 1', () => {
    const rows = distribution(candidates, defaults);
    expect(rows.map((r) => r.probability)).toEqual(
      expect.arrayContaining([expect.closeTo(0.5), expect.closeTo(0.3), expect.closeTo(0.2)]),
    );
    expect(rows.reduce((s, r) => s + r.probability, 0)).toBeCloseTo(1);
  });
  it('低温更集中，高温更平缓，零温只保留最优词', () => {
    expect(
      distribution(candidates, { ...defaults, temperature: 0.3 })[0].probability,
    ).toBeGreaterThan(0.5);
    expect(distribution(candidates, { ...defaults, temperature: 2 })[0].probability).toBeLessThan(
      0.5,
    );
    expect(distribution(candidates, { ...defaults, temperature: 0 })[0].probability).toBe(1);
  });
  it('top-k 筛选，top-p 包含跨越阈值的候选，再归一化', () => {
    const k = distribution(candidates, { ...defaults, topK: 2 });
    expect(k.filter((r) => r.probability > 0)).toHaveLength(2);
    expect(k[2].reason).toBe('Top-k');
    const p = distribution(candidates, { ...defaults, topP: 0.6 });
    expect(p.filter((r) => r.probability > 0)).toHaveLength(2);
    expect(p[2].reason).toBe('Top-p');
    expect(p[0].probability).toBeCloseTo(0.625);
    expect(
      distribution(candidates, { ...defaults, topP: 0.5 }).filter((r) => r.probability > 0),
    ).toHaveLength(1);
  });
  it('组合筛选以 top-k 后分布进行累计，保留至少一个词', () => {
    const rows = distribution(candidates, { ...defaults, topK: 2, topP: 0.6 });
    expect(rows.filter((r) => r.probability > 0)).toHaveLength(1);
    expect(distribution(candidates, { ...defaults, topP: 0 })[0].probability).toBe(1);
  });
  it('拒绝不合法输入；极大分数不导致溢出', () => {
    expect(() => distribution([], defaults)).toThrow();
    expect(() => distribution(candidates, { ...defaults, temperature: NaN })).toThrow();
    expect(() => distribution(candidates, { ...defaults, topK: -1 })).toThrow();
    expect(() => distribution(candidates, { ...defaults, topP: 2 })).toThrow();
    expect(
      distribution(
        [
          { word: 'A', logit: 10000 },
          { word: 'B', logit: 9999 },
        ],
        defaults,
      )[0].probability,
    ).toBeCloseTo(0.7310586);
  });
  it('随机数可复现，抽样边界不落入被筛掉的候选', () => {
    expect(randomAt(42, 3)).toBe(randomAt(42, 3));
    const rows = distribution(candidates, { ...defaults, topK: 1 });
    expect(sample(rows, 0).word).toBe('甲');
    expect(sample(rows, 0.999999).word).toBe('甲');
    expect(() => sample(rows, 1)).toThrow();
    expect(sample(distribution(candidates, defaults), 0.5).word).toBe('乙');
  });
  it('所有示例的所有可选分支最终结束，下一步受选词影响', () => {
    for (const example of examples) {
      const visit = (words: string[]) => {
        expect(words.length).toBeLessThanOrEqual(4);
        for (const row of candidatesFor(example.id, words)) {
          if (row.word !== '<结束>') visit([...words, row.word]);
        }
      };
      visit([]);
    }
    expect(candidatesFor('sky', ['湛蓝'])).not.toEqual(candidatesFor('sky', ['阴沉']));
    expect(candidatesFor('sky', [])).not.toEqual(candidatesFor('cake', []));
  });
});
