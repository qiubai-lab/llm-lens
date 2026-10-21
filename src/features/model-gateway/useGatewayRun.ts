import { useEffect, useMemo, useState } from 'react';
import { createEvents, replayGateway, type Scenario } from '../../core/model-gateway/flow';

export function useGatewayRun(scenario: Scenario, random: number, suspended: boolean) {
  const events = useMemo(() => createEvents(scenario, random), [scenario, random]);
  const [cursor, setCursor] = useState(0);
  const [running, setRunning] = useState(false);
  const [stepping, setStepping] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [requestNumber, setRequestNumber] = useState(1);
  const ended = cursor === events.length;
  useEffect(() => {
    if (suspended) {
      setRunning(false);
      setStepping(false);
    }
  }, [suspended]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) {
        setRunning(false);
        setStepping(false);
      }
    };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, []);
  useEffect(() => {
    if (!running || suspended || ended || selected !== null) return;
    const timer = window.setTimeout(
      () => setCursor((n) => n + 1),
      events[cursor - 1]?.kind === 'delta' ? 1700 : 2900,
    );
    return () => window.clearTimeout(timer);
  }, [running, suspended, ended, selected, cursor, events]);
  useEffect(() => {
    if (!stepping) return;
    const timer = window.setTimeout(() => setStepping(false), 1800);
    return () => window.clearTimeout(timer);
  }, [stepping, cursor, selected]);
  useEffect(() => {
    if (running && ended) {
      setRunning(false);
      setStepping(true);
    }
  }, [running, ended]);
  const visibleCursor = selected === null ? cursor : selected + 1;
  const state = useMemo(
    () => replayGateway(events, visibleCursor, scenario === 'quota' ? 50 : 1000),
    [events, visibleCursor, scenario],
  );
  return {
    animate,
    motionRunning: (running || stepping) && !suspended,
    events,
    cursor,
    state,
    selected,
    visibleCursor,
    ended,
    requestNumber,
    running: running && !ended && !suspended,
    pause: () => {
      setRunning(false);
      setStepping(false);
    },
    play: () => {
      if (suspended || ended) return;
      setSelected(null);
      setAnimate(true);
      if (!cursor) setCursor(1);
      setRunning(true);
    },
    next: () => {
      if (suspended || (ended && selected === null)) return;
      setAnimate(true);
      setStepping(true);
      setRunning(false);
      if (selected !== null && selected + 1 < cursor) {
        setSelected(selected + 1);
      } else {
        setSelected(null);
        setCursor((n) => Math.min(n + 1, events.length));
      }
    },
    inspect: (index: number) => {
      setAnimate(false);
      setStepping(false);
      setRunning(false);
      setSelected(index);
    },
    latest: () => {
      setSelected(null);
      setAnimate(false);
      setStepping(false);
    },
    reset: () => {
      setStepping(false);
      setCursor(0);
      setSelected(null);
      setAnimate(false);
      setRunning(false);
      setRequestNumber((n) => n + 1);
    },
  };
}
