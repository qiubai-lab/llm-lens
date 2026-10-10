import { useContext, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ReducedMotionContext } from '../../components/MotionPreference';
import type { FlowEvent } from '../../core/agent-conversation/fixtures';
export function DataFlight({ event, forward }: { event?: FlowEvent; forward: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useContext(ReducedMotionContext);
  const [route, setRoute] = useState<{
    from: { x: number; y: number };
    to: { x: number; y: number };
    text: string;
  }>();
  useLayoutEffect(() => {
    setRoute(undefined);
    if (!event || !forward || reduced) return;
    const map: Record<string, [string, string, string]> = {
      'local.request': [
        'chat',
        'remote',
        event.round > 1 ? '工具结果 → 下一轮请求' : '上下文 → 请求',
      ],
      'local.tool_start': ['chat', 'local', 'read_file → 文件'],
      'local.tool_result': [
        'local',
        'chat',
        `文件内容：${String(event.data.output).replaceAll('\n', ' ').slice(0, 28)}…`,
      ],
      'response.output_text.delta': ['remote', 'chat', String(event.data.delta)],
      'response.function_call_arguments.done': ['remote', 'chat', '完整参数 → Agent'],
    };
    const flow = map[event.type];
    const parent = ref.current?.parentElement;
    if (!flow || !parent || window.innerWidth < 1100) return;
    const origin = parent.getBoundingClientRect();
    const point = (name: string) => {
      const r = parent.querySelector(`[data-flow-anchor="${name}"]`)!.getBoundingClientRect();
      return {
        x: r.left - origin.left + r.width / 2,
        y: r.top - origin.top + Math.min(r.height / 2, 160),
      };
    };
    setRoute({ from: point(flow[0]), to: point(flow[1]), text: flow[2] });
  }, [event, forward, reduced]);
  return (
    <div className="agent-flight-layer" ref={ref} aria-hidden="true">
      {route && (
        <motion.div
          key={event!.id}
          className="agent-data-packet"
          initial={{ x: route.from.x, y: route.from.y, opacity: 0 }}
          animate={{ x: route.to.x, y: route.to.y, opacity: 1 }}
          transition={{ duration: 0.45, ease: 'easeInOut', opacity: { duration: 0.08 } }}
          onAnimationComplete={() => setRoute(undefined)}
        >
          <span>{route.text}</span>
        </motion.div>
      )}
    </div>
  );
}
