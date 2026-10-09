import { useCallback, useEffect, useRef, useState } from 'react';
import { candidatesFor, type ExampleId } from '../../core/lesson';
import { distribution, randomAt, sample, type Parameters } from '../../core/sampling';
export function useGeneration(example: ExampleId, params: Parameters, scene: number) {
  const [words, setWords] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [random, setRandom] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [ended, setEnded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const serial = useRef(0);
  const rows = distribution(candidatesFor(example, words), params);
  const reset = useCallback(() => {
    setWords([]);
    setSelected(null);
    setRandom(null);
    setAttempt(0);
    setEnded(false);
    setPlaying(false);
    serial.current = 0;
  }, []);
  useEffect(reset, [example, scene, reset]);
  useEffect(() => {
    setSelected(null);
    setRandom(null);
    setPlaying(false);
  }, [params.temperature, params.topK, params.topP]);
  const draw = () => {
    if (ended) return;
    const value = randomAt(2026, serial.current++);
    setRandom(value);
    setSelected(sample(rows, value).word);
    setAttempt(serial.current);
  };
  const append = () => {
    if (!selected || ended) return;
    if (selected === '<结束>') {
      setEnded(true);
      setPlaying(false);
    } else setWords((old) => [...old, selected]);
    setSelected(null);
    setRandom(null);
  };
  useEffect(() => {
    if (!playing || ended) return;
    const timer = window.setTimeout(
      () => {
        if (selected) append();
        else draw();
      },
      selected ? 1100 : 650,
    );
    return () => window.clearTimeout(timer);
  });
  useEffect(() => {
    const pause = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, []);
  return {
    words,
    selected,
    random,
    attempt,
    rows,
    ended,
    playing,
    setPlaying,
    draw,
    append,
    reset,
  };
}
