import { motion } from 'motion/react';
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useCalmMotion } from '../../components/MotionPreference';
import { flowTiming } from './motionTiming';

export function contentEntrance(reduced: boolean, delay = 0) {
  return {
    initial: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 6 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduced ? 0 : flowTiming.content,
      delay: reduced ? 0 : delay,
      ease: 'easeOut' as const,
    },
  };
}

// Stable line keys reveal newly arrived lines once; streaming updates and
// history selection keep already visible text in place.
export function RevealText({ text, delay = 0 }: { text: string; delay?: number }) {
  const reduced = useCalmMotion();
  return text.split('\n').map((line, i) => (
    <motion.span
      key={i}
      className="content-reveal-line"
      {...contentEntrance(reduced, delay + i * flowTiming.lineStagger)}
    >
      {line || '\u00a0'}
    </motion.span>
  ));
}

export function ExpandContent({ children }: { children: ReactNode }) {
  const reduced = useCalmMotion();
  const content = useRef<HTMLDivElement>(null);
  const size = useRef(0);
  const [height, setHeight] = useState(0);
  const [settled, setSettled] = useState(false);
  useLayoutEffect(() => {
    const el = content.current!;
    const measure = () => {
      const next = el.offsetHeight;
      if (next === size.current) return;
      size.current = next;
      setSettled(false);
      setHeight(next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [children]);
  return (
    <motion.div
      className="content-expand"
      initial={reduced ? false : { height: 0 }}
      animate={{ height }}
      transition={{ duration: reduced ? 0 : flowTiming.content, ease: 'easeOut' }}
      style={{ overflow: settled || reduced ? 'visible' : 'hidden' }}
      onAnimationComplete={() => setSettled(true)}
    >
      <div className="content-expand-inner" ref={content}>
        {children}
      </div>
    </motion.div>
  );
}

// Following the expanding height makes old content move upward continuously.
// Manual history browsing can stop following; an active demo can force it.
export function scrollToFollowingContent(
  el: HTMLElement,
  anchor?: string,
  automatic?: RefObject<number | null>,
) {
  let next = Math.max(0, el.scrollHeight - el.clientHeight);
  const target =
    anchor &&
    Array.from(el.querySelectorAll<HTMLElement>('[data-flow-anchor]')).find(
      (node) => node.dataset.flowAnchor === anchor,
    );
  if (target) {
    const top = target.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
    next = Math.min(next, Math.max(0, top));
  }
  if (Math.abs(el.scrollTop - next) < 1) return;
  el.scrollTop = next;
  if (automatic) automatic.current = el.scrollTop;
}

export function useFollowExpansion(
  scroll: RefObject<HTMLDivElement | null>,
  follow: RefObject<boolean>,
  enabled = true,
  force = false,
  anchor?: string,
  automatic?: RefObject<number | null>,
) {
  useLayoutEffect(() => {
    const el = scroll.current;
    if (!el || !enabled) return;
    const update = () => {
      if (follow.current || force) scrollToFollowingContent(el, anchor, automatic);
    };
    const observer = new ResizeObserver(update);
    observer.observe(el);
    const observed = new Set<Element>();
    const sync = () => {
      for (const child of observed) {
        if (!el.contains(child)) {
          observer.unobserve(child);
          observed.delete(child);
        }
      }
      el.querySelectorAll('.content-expand').forEach((child) => {
        if (!observed.has(child)) {
          observer.observe(child);
          observed.add(child);
        }
      });
      update();
    };
    const mutations = new MutationObserver(sync);
    mutations.observe(el, { childList: true, subtree: true });
    sync();
    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [scroll, follow, enabled, force, anchor, automatic]);
}
