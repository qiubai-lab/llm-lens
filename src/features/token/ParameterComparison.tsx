import { ArrowLeft, Shuffle } from 'lucide-react';
import { candidatesFor, type ExampleId } from '../../core/lesson';
import { defaults, distribution, randomAt, sample, type Parameters } from '../../core/sampling';
import { ProbabilityChart } from './ProbabilityChart';

export function ParameterComparison({
  example,
  words,
  params,
  round,
  onResample,
  onClose,
}: {
  example: ExampleId;
  words: string[];
  params: Parameters;
  round: number;
  onResample: () => void;
  onClose: () => void;
}) {
  const random = randomAt(73, round);
  return (
    <section className="comparison" aria-label="参数对比">
      <div className="comparison-heading">
        <div>
          <strong>同一上下文，同一个随机数</strong>
          <p>随机数 {random.toFixed(3)} · 只改变参数，两组结果也可能相同。</p>
        </div>
        <div className="comparison-header-actions">
          <button className="button secondary" onClick={onResample} aria-label="换一个随机数">
            <Shuffle size={15} />
            <span>换随机数</span>
          </button>
          <button className="button text-button" onClick={onClose}>
            <ArrowLeft size={16} /> 返回生成
          </button>
        </div>
      </div>
      <div className="comparison-grid">
        {[
          { title: '默认参数', parameters: defaults },
          { title: '当前参数', parameters: params },
        ].map(({ title, parameters }, i) => {
          const rows = distribution(candidatesFor(example, words), parameters);
          const chosen = sample(rows, random);
          return (
            <div className="comparison-column" key={title}>
              <div className="comparison-label">
                <strong>{title}</strong>
                <span>
                  T {parameters.temperature.toFixed(1)} · K {parameters.topK || '不限'} · P{' '}
                  {parameters.topP.toFixed(2)}
                </span>
              </div>
              <ProbabilityChart
                rows={rows}
                selected={chosen.word}
                layoutPrefix={`comparison-${i}`}
              />
              <div className="comparison-result">
                <span>本次抽到</span>
                <strong>{chosen.word === '<结束>' ? '结束标记' : chosen.word}</strong>
                <small>
                  {rows.filter((r) => r.probability > 0).length} 个候选 · 被抽中概率{' '}
                  {(chosen.probability * 100).toFixed(1)}%
                </small>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
