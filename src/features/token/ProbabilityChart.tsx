import { useCalmMotion } from '../../components/MotionPreference';
import { motion } from 'motion/react';
import { Check, Minus } from 'lucide-react';
import { Concept, definitions } from '../../components/Concept';
import type { Probability } from '../../core/sampling';
export function ProbabilityChart({
  rows,
  selected,
  layoutPrefix,
  baseline = false,
}: {
  rows: Probability[];
  selected?: string;
  layoutPrefix: string;
  baseline?: boolean;
}) {
  const reduced = useCalmMotion();
  return (
    <div className="probability-chart" aria-label="候选词概率分布">
      <div className="chart-labels">
        <span>下一个词</span>
        <span>
          {baseline ? '浅色：原始概率 · 深色：当前概率' : '参与抽样的概率'}{' '}
          <Concept title="概率" compact>
            {definitions.概率}
          </Concept>
        </span>
      </div>
      {rows.map((row, index) => (
        <div
          key={row.word}
          className={`probability-row ${row.reason ? 'excluded' : ''} ${selected === row.word ? 'chosen' : ''}`}
          data-word={row.word}
          data-probability={row.probability.toFixed(4)}
          data-excluded={Boolean(row.reason)}
        >
          <span className="candidate-index">{String(index + 1).padStart(2, '0')}</span>
          <motion.span
            layoutId={`${layoutPrefix}-${row.word}`}
            className={`candidate-word ${selected === row.word ? 'selected-word' : ''}`}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            {row.word === '<结束>' ? '结束标记' : row.word}
          </motion.span>
          <div className="bar-track">
            {baseline && <div className="bar-original" style={{ width: `${row.base * 100}%` }} />}
            <motion.div
              className="bar-fill"
              animate={{ width: `${row.probability * 100}%` }}
              transition={
                reduced ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 27 }
              }
            />
          </div>
          <span className="probability-value">
            {(row.probability * 100).toFixed(1)}
            <small>%</small>
          </span>
          <Concept title={`${row.word === '<结束>' ? '结束标记' : row.word}的概率`} compact>
            原始概率 {(row.base * 100).toFixed(1)}%；温度调整后 {(row.tempered * 100).toFixed(1)}
            %；最终抽样概率 {(row.probability * 100).toFixed(1)}%。
            {row.reason
              ? `被 ${row.reason} 排除。`
              : `参与抽样。筛选时累计概率 ${(row.cumulative * 100).toFixed(1)}%。`}
          </Concept>
          {row.reason && (
            <span className="exclusion">
              <Minus size={11} />
              {row.reason} 排除
            </span>
          )}
          {selected === row.word && (
            <span className="selection-badge">
              <Check size={12} /> 本次选中
            </span>
          )}
        </div>
      ))}
      {Array.from({ length: Math.max(0, 6 - rows.length) }, (_, i) => (
        <div
          className="probability-row probability-reserve"
          aria-hidden="true"
          key={`reserve-${i}`}
        >
          <span className="candidate-index" />
          <span className="candidate-word">候选</span>
        </div>
      ))}
    </div>
  );
}
