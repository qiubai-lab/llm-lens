export type Candidate = { word: string; logit: number };
export type Parameters = { temperature: number; topK: number; topP: number };
export type Probability = Candidate & {
  base: number;
  tempered: number;
  cumulative: number;
  probability: number;
  reason?: 'Top-k' | 'Top-p' | '零温选择';
};
export const defaults: Parameters = { temperature: 1, topK: 0, topP: 1 };

/** 教学约定：温度 → Top-k → Top-p（基于 k 后归一化分布）→ 归一化。 */
export function distribution(candidates: Candidate[], params: Parameters): Probability[] {
  const { temperature, topK, topP } = params;
  if (
    !candidates.length ||
    candidates.some((c) => !Number.isFinite(c.logit)) ||
    !Number.isFinite(temperature) ||
    temperature < 0 ||
    !Number.isInteger(topK) ||
    topK < 0 ||
    !Number.isFinite(topP) ||
    topP < 0 ||
    topP > 1
  )
    throw new Error('无效的采样输入');
  const sorted = [...candidates].sort((a, b) => b.logit - a.logit);
  const softmax = (t: number) => {
    const values = sorted.map((c) => Math.exp((c.logit - sorted[0].logit) / t));
    const total = values.reduce((s, v) => s + v, 0);
    return values.map((v) => v / total);
  };
  const base = softmax(1);
  const tempered =
    temperature === 0 ? sorted.map((_, i) => (i === 0 ? 1 : 0)) : softmax(temperature);
  const k = temperature === 0 ? 1 : topK || sorted.length;
  const kTotal = tempered.slice(0, k).reduce((s, v) => s + v, 0);
  let cumulative = 0;
  const rows: Probability[] = sorted.map((candidate, i) => {
    const before = cumulative;
    if (i < k) cumulative += tempered[i] / kTotal;
    const reason =
      i >= k
        ? temperature === 0
          ? '零温选择'
          : 'Top-k'
        : i > 0 && before >= topP - 1e-12
          ? 'Top-p'
          : undefined;
    return {
      ...candidate,
      base: base[i],
      tempered: tempered[i],
      cumulative,
      reason,
      probability: reason ? 0 : tempered[i],
    };
  });
  const total = rows.reduce((s, r) => s + r.probability, 0);
  return rows.map((r) => ({ ...r, probability: r.probability / total }));
}
export function randomAt(seed: number, index: number): number {
  let value = (seed + Math.imul(index + 1, 0x9e3779b9)) | 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return ((value ^ (value >>> 15)) >>> 0) / 4294967296;
}
export function sample(rows: Probability[], random: number): Probability {
  if (!Number.isFinite(random) || random < 0 || random >= 1)
    throw new Error('随机数应在 [0, 1) 内');
  let cumulative = 0;
  for (const row of rows) {
    cumulative += row.probability;
    if (random < cumulative) return row;
  }
  const last = rows.filter((r) => r.probability > 0).at(-1);
  if (!last) throw new Error('没有可抽样的候选');
  return last;
}
