import { useContext, useId, useLayoutEffect, useRef, useState } from 'react';
import { flowTiming } from './motionTiming';
import { motion } from 'motion/react';
import { ReducedMotionContext } from '../../components/MotionPreference';
import type { Transfer } from '../../core/agent-conversation/workbench';
import {
  flowCurve,
  elbowRoute,
  toolRails,
  workspaceRoute,
  placeFlowLabels,
  type FlowLabel,
  type Point,
} from './flowGeometry';

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
  retiring = false,
  immediate = false,
  onRetired,
  onArrived,
}: {
  transfer?: Transfer;
  active: boolean;
  laneIndex?: number;
  laneCount?: number;
  sequence?: number;
  emphasized?: boolean;
  reveal?: boolean;
  retiring?: boolean;
  immediate?: boolean;
  onRetired?: () => void;
  onArrived?: () => void;
}) {
  const label = `${sequence ? String(sequence).padStart(2, '0') + ' · ' : ''}${transfer?.label ?? ''}`;
  const markerId = useId().replace(/:/g, '');
  const layer = useRef<SVGSVGElement>(null);
  const presentation = useRef<HTMLDivElement>(null);
  const labelMeasure = useRef<HTMLSpanElement>(null);
  const reduced = useContext(ReducedMotionContext);
  const present = !retiring;
  const immediateExit = reduced || immediate;
  const [visible, setVisible] = useState(false);
  const [geometry, setGeometry] = useState<Geometry>();
  const [drawn, setDrawn] = useState(false);
  useLayoutEffect(() => {
    // An exiting connection keeps its last geometry, even after its ports are replaced.
    if (!present) return;
    const stage = layer.current?.closest<HTMLElement>('.agent-stage');
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
      const get = (name: string) => {
        const el = find(name);
        if (!el) return;
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
        if (bottom <= top || right <= left) return;
        return {
          top,
          bottom,
          left,
          right,
          width: right - left,
          height: bottom - top,
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2,
          port: el.hasAttribute('data-tool-port'),
        };
      };
      const a = get(transfer.from),
        b = get(transfer.to);
      if (!a || !b) {
        // Keep mounted geometry so restoring a scrolled item does not replay
        // its drawing animation or change its place in the history.
        setVisible(false);
        removeLabel();
        return;
      }
      setVisible(true);
      const vertical = window.innerWidth < 1180;
      const internalChat = transfer.fromArea === 'chat' && transfer.toArea === 'chat';
      const internalLocal = transfer.kind === 'content';
      const forward = vertical ? a.top < b.top : a.left < b.left;
      const from = a.port
        ? { x: a.centerX - root.left, y: a.centerY - root.top }
        : vertical
          ? { x: a.left - root.left, y: a.top - root.top + a.height / 2 }
          : {
              x: (internalChat || internalLocal ? a.left : forward ? a.right : a.left) - root.left,
              y: a.top - root.top + a.height / 2,
            };
      const to = b.port
        ? { x: b.centerX - root.left, y: b.centerY - root.top }
        : internalLocal
          ? { x: b.left - root.left + 18, y: b.top - root.top + b.height / 2 }
          : transfer.kind === 'execute'
            ? { x: b.right - root.left, y: b.top - root.top + b.height / 2 }
            : vertical
              ? { x: b.left - root.left, y: b.top - root.top + b.height / 2 }
              : {
                  x: (internalChat ? b.left : forward ? b.left : b.right) - root.left,
                  y: b.top - root.top + b.height / 2,
                };
      const local = internalChat || transfer.fromArea === 'local' || transfer.toArea === 'local';
      const chat = stage.querySelector('.agent-chat')!.getBoundingClientRect();
      const left = stage
        .querySelector(local ? '.workbench-local' : '.agent-chat')!
        .getBoundingClientRect();
      const right = stage
        .querySelector(local ? '.agent-chat' : '.workbench-service')!
        .getBoundingClientRect();
      const middle = (left.right + right.left) / 2 - root.left;
      const rails = toolRails(left.right - root.left, chat.left - root.left, vertical);
      const measured = labelMeasure.current?.getBoundingClientRect();
      const width = Math.max(76, (measured?.width ?? 56) + 20),
        height = Math.max(26, (measured?.height ?? 18) + 8);
      const x = vertical ? width / 2 + 6 : middle;
      const beforeGap = local
        ? chat
        : stage.querySelector('.workbench-local')!.getBoundingClientRect();
      let y = vertical
        ? beforeGap.bottom -
          root.top +
          parseFloat(getComputedStyle(stage).rowGap) / 2 +
          (laneIndex - (laneCount - 1) / 2) * (height + 10)
        : 48 + ((laneIndex + 0.5) * (root.height - 96)) / laneCount;
      if (vertical && internalChat) {
        const tools = stage.querySelector('.workbench-tools')!;
        const top = tools.getBoundingClientRect().top - root.top;
        const gap = parseFloat(getComputedStyle(tools).marginTop);
        y = top - gap / 2 + (transfer.kind === 'dispatch' ? -0.5 : 0.5) * (height + 8);
      }
      const direction = to.y > from.y ? 1 : -1;
      const curve = internalLocal
        ? elbowRoute(from, to, left.left - root.left - 14)
        : internalChat
          ? elbowRoute(from, to, transfer.kind === 'dispatch' ? rails.dispatch : rails.result)
          : transfer.kind === 'execute'
            ? workspaceRoute(from, to, rails.execute)
            : flowCurve(from, to);
      const d =
        internalLocal || internalChat || transfer.kind === 'execute'
          ? curve.d
          : vertical
            ? `M ${from.x} ${from.y} L 14 ${from.y} Q 6 ${from.y}, 6 ${from.y + direction * 8} L 6 ${to.y - direction * 8} Q 6 ${to.y}, 14 ${to.y} L ${to.x} ${to.y}`
            : curve.d;
      const next = { d, x, y, from, to, width, height };
      if (internalLocal) {
        removeLabel();
        setGeometry({
          ...next,
          x: left.left - root.left + width / 2 + 24,
          y: b.top - root.top - height / 2 - 6,
        });
      } else if (vertical) {
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
  }, [transfer, laneIndex, laneCount, label, markerId, sequence, present]);
  const tone = transfer?.tone ?? 'blue';
  const animate = reveal && !reduced && !transfer?.pending;
  useLayoutEffect(() => {
    if (present && visible && geometry && (drawn || !animate)) onArrived?.();
  }, [present, visible, Boolean(geometry), drawn, animate, onArrived]);
  const arrive = animate ? { duration: 0.12, delay: flowTiming.lineArrival } : { duration: 0 };
  const key = `${transfer?.kind}-${transfer?.from}-${transfer?.to}-${Boolean(transfer?.pending)}`;
  const fadeDuration = immediateExit || !reveal ? 0 : !present || !visible ? flowTiming.exit : 0.16;
  useLayoutEffect(() => {
    if (present) return;
    let frame = 0;
    const finish = () => {
      if (
        !fadeDuration ||
        !presentation.current ||
        Number(getComputedStyle(presentation.current).opacity) < 0.001
      )
        onRetired?.();
      else frame = requestAnimationFrame(finish);
    };
    frame = requestAnimationFrame(finish);
    return () => cancelAnimationFrame(frame);
  }, [present, fadeDuration, onRetired]);
  return (
    <div
      ref={presentation}
      className="flow-connection-presentation"
      data-exiting={!present}
      data-connection-kind={transfer?.kind}
      style={{
        opacity: visible && present ? 1 : 0,
        transition: `opacity ${fadeDuration}s cubic-bezier(0.45, 0, 0.55, 1)`,
      }}
      onTransitionEnd={(event) => {
        if (!present && event.target === presentation.current && event.propertyName === 'opacity')
          onRetired?.();
      }}
    >
      <span className="flow-label-measure" ref={labelMeasure} aria-hidden="true">
        {label}
      </span>
      <svg
        className={`flow-connections flow-${tone} ${reduced || !active || transfer?.pending ? 'flow-static' : ''} ${emphasized ? '' : 'flow-history'}`}
        ref={layer}
        aria-hidden="true"
        data-sequence={sequence}
        data-transfer-kind={transfer?.kind}
        data-pending={transfer?.pending}
        data-from={transfer?.from}
        data-to={transfer?.to}
        data-visible={visible}
        data-exiting={!present}
        style={{ visibility: geometry ? 'visible' : 'hidden' }}
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
            x="-24"
            y="-24"
            width="120%"
            height="120%"
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
                onAnimationComplete={() => setDrawn(true)}
                transition={
                  animate ? { duration: flowTiming.draw, ease: 'linear' } : { duration: 0 }
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
        data-exiting={!present}
        style={{ visibility: geometry ? 'visible' : 'hidden' }}
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
        {visible && present && transfer
          ? `${transfer.fromArea === 'server' ? '模型服务' : transfer.fromArea === 'local' ? '本地工作区' : 'Agent'}：${label}`
          : ''}
      </span>
    </div>
  );
}
