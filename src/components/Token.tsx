import { motion } from 'motion/react';
export function Token({ word, fresh = false, id }: { word: string; fresh?: boolean; id?: string }) {
  return (
    <motion.span
      layout
      layoutId={id}
      className={`token ${fresh ? 'fresh' : ''}`}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
    >
      {word}
    </motion.span>
  );
}
