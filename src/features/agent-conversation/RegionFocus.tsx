import { useLayoutEffect, useRef, useState } from 'react';
import { flowTiming } from './motionTiming';
import { motion } from 'motion/react';
import type { Transfer } from '../../core/agent-conversation/workbench';
import { transferKey } from '../../core/agent-conversation/workbench';
import { useCalmMotion } from '../../components/MotionPreference';

const selectors = { local: '.workbench-local', chat: '.agent-chat', server: '.workbench-service' };
type Box = { x: number; y: number; width: number; height: number };
// Decorative overlay: measurements never move the windows or execute task events.
export function RegionFocus({
  transfer,
  inspecting,
  paused,
  anchor,
  relatedAnchors,
}: {
  transfer: Transfer;
  inspecting: boolean;
  paused: boolean;
  anchor: string;
  relatedAnchors?: string[];
}) {
  const layer = useRef<HTMLDivElement>(null);
  const reduced = useCalmMotion();
  const [boxes, setBoxes] = useState<Record<Transfer['toArea'], Box>>();
  const previous = useRef<
    { area: Transfer['toArea']; boxes: Record<Transfer['toArea'], Box> } | undefined
  >(undefined);
  const area = inspecting ? 'server' : transfer.toArea;
  const highlighted = useRef<Element[]>([]);
  const identity = transferKey(transfer);
  useLayoutEffect(() => {
    const stage = layer.current?.parentElement;
    if (!stage) return;
    const apply = () => {
      highlighted.current.forEach((el) => el.removeAttribute('data-flow-focused'));
      const target = Array.from(stage.querySelectorAll('[data-flow-anchor]')).find(
        (el) => el.getAttribute('data-flow-anchor') === anchor,
      );
      const targets = relatedAnchors
        ? Array.from(stage.querySelectorAll('[data-flow-anchor]')).filter((el) =>
            relatedAnchors.includes(el.getAttribute('data-flow-anchor')!),
          )
        : target
          ? [target]
          : [];
      if (
        !inspecting &&
        transfer.toArea === 'local' &&
        transfer.kind === 'execute' &&
        transfer.to.startsWith('file-')
      ) {
        const editor = stage.querySelector('.workbench-editor');
        if (editor && !targets.includes(editor)) targets.push(editor);
        const file = Array.from(stage.querySelectorAll('[data-file-path]')).find(
          (el) => el.getAttribute('data-file-path') === transfer.to.slice('file-'.length),
        );
        if (file) targets.push(file);
      }
      targets.forEach((el) => el.setAttribute('data-flow-focused', transfer.tone));
      highlighted.current = targets;
    };
    if (reduced || inspecting || paused) {
      const frame = requestAnimationFrame(apply);
      return () => cancelAnimationFrame(frame);
    }
    const timer = window.setTimeout(apply, flowTiming.arrival * 1000);
    return () => window.clearTimeout(timer);
  }, [identity, anchor, reduced, inspecting, paused, transfer.tone, relatedAnchors]);
  useLayoutEffect(
    () => () => {
      highlighted.current.forEach((el) => el.removeAttribute('data-flow-focused'));
    },
    [],
  );
  useLayoutEffect(() => {
    const stage = layer.current?.parentElement;
    if (!stage) return;
    let frame = 0;
    const measure = () => {
      const root = stage.getBoundingClientRect();
      const next = {} as Record<Transfer['toArea'], Box>;
      for (const [name, selector] of Object.entries(selectors)) {
        const rect = stage.querySelector(selector)?.getBoundingClientRect();
        if (!rect) return;
        next[name as Transfer['toArea']] = {
          x: rect.left - root.left - 3,
          y: rect.top - root.top - 3,
          width: rect.width + 6,
          height: rect.height + 6,
        };
      }
      setBoxes((current) =>
        current &&
        Object.keys(selectors).every((name) => {
          const a = current[name as Transfer['toArea']],
            b = next[name as Transfer['toArea']];
          return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
        })
          ? current
          : next,
      );
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    observer.observe(stage);
    Object.values(selectors).forEach((selector) => {
      const el = stage.querySelector(selector);
      if (el) observer.observe(el);
    });
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);
  const resized = previous.current?.area === area && previous.current.boxes !== boxes;
  useLayoutEffect(() => {
    if (boxes) previous.current = { area, boxes };
  });
  if (!boxes)
    return <div ref={layer} className="region-focus" aria-hidden="true" style={{ opacity: 0 }} />;
  return (
    <motion.div
      ref={layer}
      className={`region-focus flow-${transfer.tone}`}
      aria-hidden="true"
      data-focus-area={area}
      initial={
        reduced || inspecting || paused ? false : { ...boxes[transfer.fromArea], opacity: 1 }
      }
      animate={boxes ? { ...boxes[area], opacity: 1 } : { opacity: 0 }}
      transition={
        reduced || inspecting || paused || resized
          ? { duration: 0 }
          : { type: 'spring', duration: flowTiming.focus, bounce: 0, delay: flowTiming.lineArrival }
      }
    />
  );
}
