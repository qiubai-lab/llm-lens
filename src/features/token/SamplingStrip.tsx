import { useCalmMotion } from '../../components/MotionPreference';
import { motion } from 'motion/react';
import type { Probability } from '../../core/sampling';
export function SamplingStrip({
  rows,
  random,
  attempt,
}: {
  rows: Probability[];
  random: number | null;
  attempt: number;
}) {
  const reduced = useCalmMotion();
  return (
    <div className="sampling-section">
      <div className="sampling-caption">
        <span>把概率铺成一条线</span>
        <span>
          {random === null ? '点击抽样，随机落下一枚指针' : `本次随机数 ${random.toFixed(3)}`}
        </span>
      </div>
      <div className="sampling-strip">
        {rows
          .filter((r) => r.probability > 0)
          .map((r, i) => (
            <motion.div
              key={r.word}
              className={`sample-segment segment-${i % 6}`}
              animate={{ width: `${r.probability * 100}%` }}
              transition={{ duration: reduced ? 0 : 0.3 }}
              title={`${r.word}: ${(r.probability * 100).toFixed(1)}%`}
            >
              <span>{r.probability >= 0.12 ? (r.word === '<结束>' ? '结束' : r.word) : ''}</span>
            </motion.div>
          ))}
        {random !== null && (
          <motion.div
            key={attempt}
            className="sample-pointer"
            initial={{ left: '0%' }}
            animate={{ left: `${random * 100}%` }}
            transition={{ duration: reduced ? 0 : 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <span>▾</span>
          </motion.div>
        )}
      </div>
      <div className="sampling-scale">
        <span>0</span>
        <span>概率越大，占据的区间越长</span>
        <span>1</span>
      </div>
    </div>
  );
}
