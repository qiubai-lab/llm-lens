import { useContext, useId, useLayoutEffect, useRef, useState } from 'react';
import { flowTiming } from './motionTiming';
import { motion } from 'motion/react';
import { ReducedMotionContext } from '../../components/MotionPreference';
import type { Transfer } from '../../core/agent-conversation/workbench';
import { flowCurve, placeFlowLabels, type FlowLabel, type Point } from './flowGeometry';

type Geometry = {
  d: string;
  width: number;
  height: number;
  x: number;
  y: number;
  from: Point;
  to: Point;
};
type LabelEntry = FlowLabel & { geometry: Geometry; publish: (geometry: Geometry) => void };
const stageLabels = new WeakMap<HTMLElement, Map<string, LabelEntry>>();

function arrangeLabels(entries: Map<string, LabelEntry>) {
  const positions = placeFlowLabels([...entries.values()]);
  for (const [id, entry] of entries) {
    const point = positions.get(id);
    if (point) entry.publish({ ...entry.geometry, ...point });
  }
}

export function FlowConnections({
  transfer,
  active,
  laneIndex = 0,
  laneCount = 1,
  sequence,
  emphasized = true,
  reveal = true,
}: {
  transfer?: Transfer;
  active: boolean;
  laneIndex?: number;
  laneCount?: number;
  sequence?: number;
  emphasized?: boolean;
  reveal?: boolean;
}) {
  const label = `${sequence ? String(sequence).padStart(2, '0') + ' · ' : ''}${transfer?.label ?? ''}`;
  const markerId = useId().replace(/:/g, '');
  const layer = useRef<SVGSVGElement>(null);
  const labelMeasure = useRef<HTMLSpanElement>(null);
  const reduced = useContext(ReducedMotionContext);
  const [visible, setVisible] = useState(false);
  const [geometry, setGeometry] = useState<Geometry>();
  useLayoutEffect(() => {
    const stage = layer.current?.parentElement;
    if (!stage || !transfer) {
      setGeometry(undefined);
      setVisible(false);
      return;
    }
    const entries = stageLabels.get(stage) ?? new Map<string, LabelEntry>();
    stageLabels.set(stage, entries);
    const removeLabel = () => {
      if (entries.delete(markerId)) arrangeLabels(entries);
    };
    let frame = 0;
    const find = (name: string) =>
      Array.from(stage.querySelectorAll<HTMLElement>('[data-flow-anchor]')).find(
        (e) => e.dataset.flowAnchor === name,
      );
    const measure = () => {
      const root = stage.getBoundingClientRect();
      const get = (name: string, area: Transfer['fromArea']) => {
        const el = find(name),
          fallback = find(`${area}-port`);
        // Only local tools have a fallback port. Chat and server links must
        // point to visible content, rather than collecting at a pane edge.
        const fallbackRect = () =>
          area === 'local' ? fallback?.getBoundingClientRect() : undefined;
        if (!el) return fallbackRect();
        const rect = el.getBoundingClientRect();
        let top = rect.top,
          bottom = rect.bottom,
          left = rect.left,
          right = rect.right;
        let parent = el.parentElement;
        while (parent && parent !== stage) {
          const style = getComputedStyle(parent),
            clip = parent.getBoundingClientRect();
          if (['auto', 'scroll', 'hidden'].includes(style.overflowY)) {
            top = Math.max(top, clip.top);
            bottom = Math.min(bottom, clip.bottom);
          }
          if (['auto', 'scroll', 'hidden'].includes(style.overflowX)) {
            left = Math.max(left, clip.left);
            right = Math.min(right, clip.right);
          }
          parent = parent.parentElement;
        }
        if (bottom <= top || right <= left) return fallbackRect();
        return { top, bottom, left, right, width: right - left, height: bottom - top };
      };
      const a = get(transfer.from, transfer.fromArea),
        b = get(transfer.to, transfer.toArea);
      if (!a || !b) {
        // Keep mounted geometry so restoring a scrolled item does not replay
        // its drawing animation or change its place in the history.
        setVisible(false);
        removeLabel();
        return;
      }
      setVisible(true);
      const vertical = window.innerWidth < 1180;
      const forward = vertical ? a.top < b.top : a.left < b.left;
      const from = vertical
        ? { x: a.left - root.left, y: a.top - root.top + a.height / 2 }
        : { x: (forward ? a.right : a.left) - root.left, y: a.top - root.top + a.height / 2 };
      const to = vertical
        ? { x: b.left - root.left, y: b.top - root.top + b.height / 2 }
        : { x: (forward ? b.left : b.right) - root.left, y: b.top - root.top + b.height / 2 };
      const local = transfer.fromArea === 'local' || transfer.toArea === 'local';
      const chat = stage.querySelector('.agent-chat')!.getBoundingClientRect();
      const left = stage
        .querySelector(local ? '.workbench-local' : '.agent-chat')!
        .getBoundingClientRect();
      const right = stage
        .querySelector(local ? '.agent-chat' : '.workbench-service')!
        .getBoundingClientRect();
      const middle = (left.right + right.left) / 2 - root.left;
      const measured = labelMeasure.current?.getBoundingClientRect();
      const width = Math.max(76, (measured?.width ?? 56) + 20),
        height = Math.max(26, (measured?.height ?? 18) + 8);
      const x = vertical ? width / 2 + 6 : middle;
      const beforeGap = local
        ? chat
        : stage.querySelector('.workbench-local')!.getBoundingClientRect();
      const y = vertical
        ? beforeGap.bottom -
          root.top +
          parseFloat(getComputedStyle(stage).rowGap) / 2 +
          (laneIndex - (laneCount - 1) / 2) * (height + 10)
        : 48 + ((laneIndex + 0.5) * (root.height - 96)) / laneCount;
      const direction = to.y > from.y ? 1 : -1;
      const curve = flowCurve(from, to);
      const d = vertical
        ? `M ${from.x} ${from.y} L 14 ${from.y} Q 6 ${from.y}, 6 ${from.y + direction * 8} L 6 ${to.y - direction * 8} Q 6 ${to.y}, 14 ${to.y} L ${to.x} ${to.y}`
        : curve.d;
      const next = { d, x, y, from, to, width, height };
      if (vertical) {
        removeLabel();
        setGeometry(next);
      } else {
        const gapLeft = left.right - root.left + width / 2 + 4;
        const gapRight = right.left - root.left - width / 2 - 4;
        entries.set(markerId, {
          id: markerId,
          order: sequence ?? 100 + laneIndex,
          width,
          height,
          geometry: next,
          candidates: [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.15, 0.85].map((t) => {
            const point = curve.point(t);
            return {
              x: gapLeft <= gapRight ? Math.max(gapLeft, Math.min(gapRight, point.x)) : middle,
              y: point.y,
            };
          }),
          publish: (value) =>
            setGeometry((current) =>
              current &&
              current.d === value.d &&
              current.x === value.x &&
              current.y === value.y &&
              current.width === value.width &&
              current.height === value.height
                ? current
                : value,
            ),
        });
        arrangeLabels(entries);
      }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(stage);
    const observed = new Set<Element>();
    const observeContent = () => {
      for (const el of observed) {
        if (!stage.contains(el)) {
          observer.unobserve(el);
          observed.delete(el);
        }
      }
      stage.querySelectorAll('[data-flow-anchor], .content-expand').forEach((el) => {
        if (!observed.has(el)) {
          observer.observe(el);
          observed.add(el);
        }
      });
    };
    observeContent();
    const mutations = new MutationObserver((records) => {
      if (
        records.some(
          (record) =>
            !(
              record.target instanceof Element ? record.target : record.target.parentElement
            )?.closest('.flow-connections, .flow-label-layer'),
        )
      ) {
        observeContent();
        schedule();
      }
    });
    mutations.observe(stage, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-flow-anchor', 'open'],
    });
    stage.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      mutations.disconnect();
      stage.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      removeLabel();
    };
  }, [transfer, laneIndex, laneCount, label, markerId, sequence]);
  const tone = transfer?.tone ?? 'blue';
  const animate = reveal && !reduced;
  const arrive = animate ? { duration: 0.12, delay: flowTiming.lineArrival } : { duration: 0 };
  const key = `${transfer?.kind}-${transfer?.from}-${transfer?.to}`;
  return (
    <>
      <span className="flow-label-measure" ref={labelMeasure} aria-hidden="true">
        {label}
      </span>
      <svg
        className={`flow-connections flow-${tone} ${reduced || !active ? 'flow-static' : ''} ${emphasized ? '' : 'flow-history'}`}
        ref={layer}
        aria-hidden="true"
        data-sequence={sequence}
        data-transfer-kind={transfer?.kind}
        data-pending={transfer?.pending}
        data-from={transfer?.from}
        data-to={transfer?.to}
        data-visible={visible}
        style={{ visibility: visible ? 'visible' : 'hidden' }}
      >
        <defs>
          <marker
            id={`flow-arrow-${markerId}`}
            markerWidth="7"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <path d="M0,0 L7,3.5 L0,7 Z" fill="currentColor" />
          </marker>
          <mask
            id={`flow-reveal-${markerId}`}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="100%"
            height="100%"
            style={{ maskType: 'alpha' }}
          >
            {geometry && (
              <motion.path
                key={key}
                className="flow-reveal-path"
                d={geometry.d}
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                initial={{ pathLength: animate ? 0 : 1 }}
                animate={{ pathLength: 1 }}
                transition={
                  animate
                    ? { duration: flowTiming.draw, ease: 'linear' }
                    : { duration: 0 }
                }
              />
            )}
          </mask>
        </defs>
        {geometry && (
          <g key={key}>
            <g mask={`url(#flow-reveal-${markerId})`}>
              <path className="flow-underlay" d={geometry.d} />
              <path
                className="flow-path"
                d={geometry.d}
                markerEnd={`url(#flow-arrow-${markerId})`}
              />
            </g>
            <circle className="flow-origin" cx={geometry.from.x} cy={geometry.from.y} r="4" />
            <motion.circle
              className="flow-target"
              cx={geometry.to.x}
              cy={geometry.to.y}
              r="4"
              initial={{ opacity: animate ? 0 : 1 }}
              animate={{ opacity: 1 }}
              transition={arrive}
            />
          </g>
        )}
      </svg>
      <svg
        className={`flow-label-layer flow-${tone} ${emphasized ? '' : 'flow-history'}`}
        aria-hidden="true"
        data-sequence={sequence}
        data-visible={visible}
        style={{ visibility: visible ? 'visible' : 'hidden' }}
      >
        {geometry && (
          <motion.g
            transform={`translate(${geometry.x} ${geometry.y})`}
            initial={{ opacity: animate ? 0 : 1 }}
            animate={{ opacity: 1 }}
            transition={arrive}
          >
            <rect
              x={-geometry.width / 2}
              y={-geometry.height / 2}
              width={geometry.width}
              height={geometry.height}
              rx={geometry.height / 2}
            />
            <text textAnchor="middle" dominantBaseline="central">
              {label}
            </text>
          </motion.g>
        )}
      </svg>
      <span className="sr-only" role="status">
        {visible && transfer
          ? `${transfer.fromArea === 'server' ? '模型服务' : transfer.fromArea === 'local' ? '本地工作区' : 'Agent'}：${label}`
          : ''}
      </span>
    </>
  );
}
