import { motion } from 'motion/react';
import { useCalmMotion } from '../../components/MotionPreference';
import type { Probability } from '../../core/sampling';

export function FilterBoundary({ rows, topP }: { rows: Probability[]; topP: number }) {
  const reduced = useCalmMotion();
  const pool = rows.filter((row) => row.reason !== 'Top-k' && row.reason !== '零温选择');
  const retained = pool.filter((row) => !row.reason).at(-1)?.cumulative ?? 1;
  return (
    <div className="filter-boundary">
      <div className="sampling-caption">
        <span>Top-k 后，按概率从高到低累加</span>
        <span>Top-p = {(topP * 100).toFixed(0)}%</span>
      </div>
      <div className="cumulative-track">
        {pool.map((row, i) => (
          <motion.div
            key={row.word}
            animate={{
              width: `${(row.cumulative - (pool[i - 1]?.cumulative ?? 0)) * 100}%`,
              opacity: row.reason ? 0.22 : 1,
            }}
            transition={{ duration: reduced ? 0 : 0.3 }}
            className={`cumulative-segment segment-${i}`}
          >
            <span>{row.word}</span>
          </motion.div>
        ))}
        <motion.span
          className="threshold-marker"
          animate={{ left: `${topP * 100}%` }}
          transition={{ duration: reduced ? 0 : 0.3 }}
        />
      </div>
      <div className="sampling-scale">
        <span>0</span>
        <span>保留到累计 {(retained * 100).toFixed(1)}%，包含跨过阈值的词</span>
        <span>100%</span>
      </div>
    </div>
  );
}
