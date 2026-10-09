import type { Candidate } from './sampling';
export type ExampleId = 'sky' | 'cake';
export const examples: { id: ExampleId; label: string; tokens: string[] }[] = [
  { id: 'sky', label: '看天空', tokens: ['今天', '的', '天空', '很'] },
  { id: 'cake', label: '尝蛋糕', tokens: ['刚出炉', '的', '蛋糕', '很'] },
];
const scores = (words: string[], weights: number[]): Candidate[] =>
  words.map((word, i) => ({ word, logit: Math.log(weights[i]) }));
export function candidatesFor(example: ExampleId, generated: string[]): Candidate[] {
  if (!generated.length)
    return example === 'sky'
      ? scores(['湛蓝', '晴朗', '明亮', '阴沉', '漂亮', '辽阔'], [40, 25, 15, 10, 6, 4])
      : scores(['松软', '香甜', '细腻', '美味', '蓬松', '烫'], [38, 27, 16, 10, 6, 3]);
  if (generated.length === 1) {
    if (example === 'sky')
      return generated[0] === '阴沉'
        ? scores(['，像是', '，也许', '，似乎'], [50, 30, 20])
        : scores(['，让人', '，令人', '，使人'], [50, 30, 20]);
    return generated[0] === '烫'
      ? scores(['，需要', '，最好', '，记得'], [50, 30, 20])
      : scores(['，让人', '，令人', '，使人'], [50, 30, 20]);
  }
  if (generated.length === 2) {
    if (example === 'sky')
      return generated[0] === '阴沉'
        ? scores(['快要下雨', '要下雨了', '有雨要来'], [55, 30, 15])
        : scores(['心情愉快', '想去散步', '感到放松'], [50, 30, 20]);
    return generated[0] === '烫'
      ? scores(['稍等片刻', '慢慢品尝', '小心入口'], [55, 30, 15])
      : scores(['回味无穷', '忍不住再吃一口', '心情愉悦'], [50, 30, 20]);
  }
  if (generated.length === 3) return scores(['。'], [1]);
  return scores(['<结束>'], [1]);
}
export const scenes = [
  {
    title: '从一句话开始',
    short: '文字与 Token',
    kicker: '01 / CONTEXT',
    description: '模型看见的，是一个个片段。这里先把它们想成词。',
    insight: '真实的 token 可能是字、子词或标点。这里按词与短语简化展示，帮助你先理解生成过程。',
  },
  {
    title: '下一个词，有很多可能',
    short: '预测下一个词',
    kicker: '02 / PREDICTION',
    description: '给定上文，模型为每个可能的下一个词分配一个概率。',
    insight: '换一段上下文，候选和概率就会改变。它不是先写好整句话，再逐字显示出来。',
  },
  {
    title: '给随机性，调个温度',
    short: 'Temperature',
    kicker: '03 / TEMPERATURE',
    description: '调低更集中，调高更平缓。拖动滑杆，看概率如何流动。',
    insight:
      'Temperature 调整抽样分布，不会增加模型的知识。高温让低概率候选更有机会，并不保证更好的答案。',
  },
  {
    title: '哪些词，能进入候选池？',
    short: 'Top-k 与 Top-p',
    kicker: '04 / FILTER',
    description: '先按排名留下候选，再按累计概率划定范围。',
    insight:
      'Top-k 限定数量；Top-p 保留累计概率达到阈值的最小前缀，包含跨过阈值的那个词。这里先执行 Top-k，再执行 Top-p。',
  },
  {
    title: '从可能，到一个确定的词',
    short: '抽样与选择',
    kicker: '05 / SAMPLING',
    description: '概率决定机会，不保证结果。点击抽样，看这次落在哪里。',
    insight: '同一段上下文、同一组参数，也可能抽到不同的词。被筛掉的候选则不会被抽中。',
  },
  {
    title: '接回上下文，然后再来一次',
    short: '循环生成',
    kicker: '06 / GENERATION',
    description: '每生成一个词，就带着新的上下文，预测下一个。',
    insight:
      '参数影响本轮选择，选出的词又影响后续候选。生成持续到结束标记或其他停止条件；句号本身不一定意味着结束。',
  },
] as const;
export const topic = {
  id: 'token',
  title: '一个词，是怎样生成的？',
  subtitle: '从 Token 到自回归生成',
  duration: '约 5 分钟',
  scenes,
};
