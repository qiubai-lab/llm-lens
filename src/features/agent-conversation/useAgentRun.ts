import { useEffect, useMemo, useState } from 'react';
import { createLesson, type Branch } from '../../core/agent-conversation/fixtures';
import { replay } from '../../core/agent-conversation/flow';
import { interactionGate } from '../../core/agent-conversation/workbench';

export function useAgentRun(scene: number, branch: Branch, suspended: boolean) {
  const lesson = useMemo(() => createLesson(scene, branch), [scene, branch]);
  const [cursor, setCursor] = useState(0);
  const [running, setRunning] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const state = useMemo(() => replay(lesson, cursor), [lesson, cursor]);
  const gate = useMemo(() => interactionGate(lesson, cursor), [lesson, cursor]);
  const ended = cursor === lesson.events.length;
  useEffect(() => {
    if (suspended) setRunning(false);
  }, [suspended]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) setRunning(false);
    };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, []);
  useEffect(() => {
    if (!running || suspended || cancelled || gate || ended) return;
    const next = lesson.events[cursor];
    const delay =
      next.type === 'local.tool_result'
        ? 1100
        : next.type.startsWith('local.') || next.type.includes('delta')
          ? 700
          : 250;
    const timer = window.setTimeout(
      () => setCursor((c) => Math.min(c + 1, lesson.events.length)),
      delay,
    );
    return () => window.clearTimeout(timer);
  }, [running, suspended, cancelled, gate, ended, lesson, cursor]);
  const send = () => {
    if (suspended) return;
    if (cancelled || ended || cursor === 0) {
      setCursor(1);
      setCancelled(false);
    }
    setRunning(true);
  };
  const execute = () => {
    if (suspended || cancelled || !gate) return;
    setCursor((c) => c + 1);
    setRunning(true);
  };
  const reset = () => {
    setRunning(false);
    setCancelled(false);
    setCursor(0);
  };
  const stop = () => {
    setRunning(false);
    setCancelled(true);
  };
  const busy = running && !cancelled && !ended;
  const phase = cancelled
    ? '已停止'
    : ended
      ? state.task === 'blocked'
        ? '任务受阻'
        : scene === 0
          ? '请求已送达'
          : '任务完成'
      : gate
        ? '等待执行读取'
        : busy
          ? state.calls.some((c) => c.status === 'running')
            ? '读取中'
            : '处理中'
          : cursor
            ? '已暂停'
            : '准备就绪';
  return { lesson, cursor, state, gate, busy, cancelled, ended, phase, send, execute, reset, stop };
}
