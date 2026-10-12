import { useContext, useLayoutEffect, useRef, useState } from 'react';
import { ReducedMotionContext } from '../../components/MotionPreference';
import type { Transfer } from '../../core/agent-conversation/workbench';
export function FlowConnections({ transfer, active }: { transfer?: Transfer; active: boolean }) {
  const layer = useRef<SVGSVGElement>(null);
  const labelMeasure = useRef<HTMLSpanElement>(null);
  const reduced = useContext(ReducedMotionContext);
  const [geometry, setGeometry] = useState<{
    d: string;
    width: number;
    height: number;
    x: number;
    y: number;
    from: { x: number; y: number };
    to: { x: number; y: number };
  }>();
  useLayoutEffect(() => {
    const stage = layer.current?.parentElement;
    if (!stage || !transfer) {
      setGeometry(undefined);
      return;
    }
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
        if (!el) return fallback?.getBoundingClientRect();
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
        if (bottom <= top || right <= left) return fallback?.getBoundingClientRect();
        return { top, bottom, left, right, width: right - left, height: bottom - top };
      };
      const a = get(transfer.from, transfer.fromArea),
        b = get(transfer.to, transfer.toArea);
      if (!a || !b) {
        setGeometry(undefined);
        return;
      }
      const vertical = window.innerWidth < 1180;
      const forward = vertical ? a.top < b.top : a.left < b.left;
      const from = vertical
        ? { x: a.left - root.left, y: a.top - root.top + a.height / 2 }
        : { x: (forward ? a.right : a.left) - root.left, y: a.top - root.top + a.height / 2 };
      const to = vertical
        ? { x: b.left - root.left, y: b.top - root.top + b.height / 2 }
        : { x: (forward ? b.left : b.right) - root.left, y: b.top - root.top + b.height / 2 };
      const middle = (from.x + to.x) / 2;
      const direction = to.y > from.y ? 1 : -1;
      const d = vertical
        ? `M ${from.x} ${from.y} L 14 ${from.y} Q 6 ${from.y}, 6 ${from.y + direction * 8} L 6 ${to.y - direction * 8} Q 6 ${to.y}, 14 ${to.y} L ${to.x} ${to.y}`
        : `M ${from.x} ${from.y} C ${middle} ${from.y}, ${middle} ${to.y}, ${to.x} ${to.y}`;
      const label = labelMeasure.current?.getBoundingClientRect();
      const width = Math.max(76, (label?.width ?? 56) + 20),
        height = Math.max(26, (label?.height ?? 18) + 8);
      const x = vertical ? width / 2 + 6 : middle;
      const chat = stage.querySelector('.agent-chat')?.getBoundingClientRect();
      const y =
        vertical && chat
          ? chat.bottom - root.top + parseFloat(getComputedStyle(stage).rowGap) / 2
          : (from.y + to.y) / 2;
      setGeometry({ d, x, y, from, to, width, height });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(stage);
    stage.querySelectorAll('[data-flow-anchor]').forEach((el) => observer.observe(el));
    const mutations = new MutationObserver((records) => {
      if (records.some((record) => !layer.current?.contains(record.target))) schedule();
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
    };
  }, [transfer]);
  const tone = transfer?.tone ?? 'blue';
  return (
    <>
      <span className="flow-label-measure" ref={labelMeasure} aria-hidden="true">
        {transfer?.label}
      </span>
      <svg
        className={`flow-connections flow-${tone} ${reduced || !active ? 'flow-static' : ''}`}
        ref={layer}
        aria-hidden="true"
        data-transfer-kind={transfer?.kind}
        data-from={transfer?.from}
        data-to={transfer?.to}
      >
        <defs>
          <marker
            id={`flow-arrow-${tone}`}
            markerWidth="7"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <path d="M0,0 L7,3.5 L0,7 Z" fill="currentColor" />
          </marker>
        </defs>
        {geometry && (
          <g key={transfer?.id}>
            <path className="flow-underlay" d={geometry.d} />
            <path className="flow-path" d={geometry.d} markerEnd={`url(#flow-arrow-${tone})`} />
            <circle className="flow-origin" cx={geometry.from.x} cy={geometry.from.y} r="4" />
            <circle className="flow-target" cx={geometry.to.x} cy={geometry.to.y} r="4" />
            <g transform={`translate(${geometry.x} ${geometry.y})`}>
              <rect
                x={-geometry.width / 2}
                y={-geometry.height / 2}
                width={geometry.width}
                height={geometry.height}
                rx={geometry.height / 2}
              />
              <text textAnchor="middle" dominantBaseline="central">
                {transfer?.label}
              </text>
            </g>
          </g>
        )}
      </svg>
      <span className="sr-only" role="status">
        {transfer
          ? `${transfer.fromArea === 'server' ? '模型服务' : transfer.fromArea === 'local' ? '本地工作区' : 'Agent'}：${transfer.label}`
          : ''}
      </span>
    </>
  );
}
