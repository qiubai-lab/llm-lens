import { useEffect, useMemo, useState } from 'react';
import { createLesson, type Branch } from '../../core/agent-conversation/fixtures';
import { replay } from '../../core/agent-conversation/flow';

export function useAgentPlayback(scene: number, branch: Branch, suspended: boolean) {
  const lesson = useMemo(() => createLesson(scene, branch), [scene, branch]);
  const [cursor, setCursor] = useState(lesson.initialCursor);
  const [playing, setPlaying] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  useEffect(() => {
    if (suspended) setPlaying(false);
  }, [suspended]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, []);
  useEffect(() => {
    if (!playing || suspended || cancelled) return;
    if (cursor >= lesson.events.length) {
      setPlaying(false);
      return;
    }
    const next = lesson.events[cursor];
    const delay = next.type.startsWith('local.') || next.type.includes('delta') ? 1000 : 450;
    const timer = window.setTimeout(
      () => setCursor((c) => Math.min(c + 1, lesson.events.length)),
      delay,
    );
    return () => window.clearTimeout(timer);
  }, [playing, cursor, lesson, suspended, cancelled]);
  const state = useMemo(() => replay(lesson, cursor), [lesson, cursor]);
  return {
    lesson,
    cursor,
    playing,
    cancelled,
    state,
    toggle: () => {
      if (!suspended && !cancelled) setPlaying((p) => !p);
    },
    step: () => {
      setPlaying(false);
      if (!cancelled) setCursor((c) => Math.min(c + 1, lesson.events.length));
    },
    seek: (value: number) => {
      setPlaying(false);
      setCursor(value);
    },
    reset: () => {
      setPlaying(false);
      setCancelled(false);
      setCursor(lesson.initialCursor);
    },
    cancel: () => {
      setPlaying(false);
      setCancelled(true);
    },
  };
}
