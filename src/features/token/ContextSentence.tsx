import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { Token } from '../../components/Token';
import { candidatesFor, examples, type ExampleId } from '../../core/lesson';

// Reserve actual teaching branches in normal flow. Hidden copies are sizing only;
// the live sentence remains the sole accessible and animated content.
function completedBranches(example: ExampleId, words: string[] = []): string[][] {
  return candidatesFor(example, words).flatMap(({ word }) =>
    word === '<结束>' ? [words] : completedBranches(example, [...words, word]),
  );
}

export function ContextSentence({
  example,
  scene,
  split,
  words,
  ended,
}: {
  example: ExampleId;
  scene: number;
  split: boolean;
  words: string[];
  ended: boolean;
}) {
  const initial = examples.find((e) => e.id === example)!.tokens;
  const reserves = useMemo(() => {
    // CJK fixture fragments of the same length have the same token footprint.
    const unique = new Map<string, string[]>();
    for (const branch of completedBranches(example)) {
      unique.set(branch.map((word) => word.length).join(','), branch);
    }
    return [...unique.values()];
  }, [example]);
  const endChip = (
    <span className="end-chip">
      <Check size={16} /> 生成结束
    </span>
  );
  return (
    <div className="sentence-slot">
      {scene === 0 ? (
        <>
          <div className="sentence sentence-reserve" aria-hidden="true">
            {initial.map((word, i) => (
              <span className="token" key={i}>
                {word}
              </span>
            ))}
            <span className="token empty-token">?</span>
          </div>
          <div className="sentence sentence-reserve" aria-hidden="true">
            <span className="unsplit-sentence">{initial.join('')}</span>
            <span className="token empty-token">?</span>
          </div>
        </>
      ) : scene === 5 ? (
        reserves.flatMap((branch, i) =>
          [endChip, <span className="token empty-token" key="cursor" />].map((tail, k) => (
            <div className="sentence sentence-reserve" aria-hidden="true" key={`${i}-${k}`}>
              {[...initial, ...branch].map((word, j) => (
                <span className="token" key={j}>
                  {word}
                </span>
              ))}
              {tail}
            </div>
          )),
        )
      ) : null}
      <div className="sentence sentence-live" aria-label="当前上下文">
        {scene === 0 && !split ? (
          <span className="unsplit-sentence">{initial.join('')}</span>
        ) : (
          initial.map((word, i) => (
            <Token key={`${example}-${i}`} word={word} id={`context-${example}-${i}`} />
          ))
        )}
        {words.map((word, i) => (
          <Token key={`${i}-${word}`} word={word} fresh id={`deck-${example}-${i}-${word}`} />
        ))}
        {ended ? (
          endChip
        ) : (
          <motion.span layout="position" className="token empty-token">
            {scene === 0 ? '?' : <span className="insertion-caret" />}
          </motion.span>
        )}
      </div>
    </div>
  );
}
