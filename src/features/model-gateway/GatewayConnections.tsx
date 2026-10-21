import { useEffect, useState, type RefObject } from 'react';
import { flowCurve } from '../../components/flow/geometry';
import { useCalmMotion } from '../../components/MotionPreference';
import type { Channel, GatewayEvent, GatewayState } from '../../core/model-gateway/flow';

type Connection = { id: string; d: string; reverse: string; from: string; to: string };
// Topology is persistent. Event traffic is a separate, temporary overlay.
export function GatewayConnections({
  stage,
  event,
  running,
  inspecting,
  channels,
  selected,
  attempts,
}: {
  stage: RefObject<HTMLDivElement | null>;
  event?: GatewayEvent;
  running: boolean;
  inspecting: boolean;
  channels: Channel[];
  selected?: string;
  attempts: GatewayState['attempts'];
}) {
  const reduced = useCalmMotion();
  const [connections, setConnections] = useState<Connection[]>([]);
  const channelKey = channels.map((c) => c.id).join(',');
  useEffect(() => {
    const root = stage.current;
    if (!root) return;
    const measure = () => {
      if (window.innerWidth < 1000) {
        setConnections([]);
        return;
      }
      const bounds = root.getBoundingClientRect();
      const get = (id: string) =>
        root.querySelector<HTMLElement>(`[data-gateway-anchor="${id}"]`)?.getBoundingClientRect();
      const links = [
        ['client', 'gateway'],
        ...channelKey.split(',').map((id) => ['gateway', `channel-${id}`]),
      ];
      const next: Connection[] = [];
      for (const [fromId, toId] of links) {
        const from = get(fromId),
          to = get(toId);
        if (!from || !to) continue;
        const a = { x: from.right - bounds.left, y: from.top + from.height * 0.5 - bounds.top };
        const b = { x: to.left - bounds.left, y: to.top + to.height * 0.5 - bounds.top };
        next.push({
          id: `${fromId}-${toId}`,
          d: flowCurve(a, b).d,
          reverse: flowCurve(b, a).d,
          from: fromId,
          to: toId,
        });
      }
      setConnections(next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    root.querySelectorAll('[data-gateway-anchor]').forEach((el) => observer.observe(el));
    window.addEventListener('resize', measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [stage, channelKey]);
  const transfer = event?.transfer;
  return (
    <svg
      className="gateway-topology"
      aria-hidden="true"
      data-static={reduced || inspecting}
      data-paused={!running}
    >
      {connections.map((link) => {
        const channel = link.to.startsWith('channel-') ? link.to.slice(8) : undefined;
        const attempt = attempts.filter((a) => a.channel === channel).at(-1);
        const chosen = !channel || selected === channel || !!attempt;
        const active =
          !!transfer &&
          ((link.from === transfer.from && link.to === transfer.to) ||
            (link.from === transfer.to && link.to === transfer.from) ||
            (transfer.from.startsWith('channel-') &&
              transfer.to === 'client' &&
              (link.from === 'client' || link.to === transfer.from)));
        const backwards = transfer?.to === 'client' || transfer?.from.startsWith('channel-');
        return (
          <g key={link.id} data-connection={link.id}>
            <path
              className="gateway-topology-base"
              d={link.d}
              data-chosen={chosen}
              data-failed={attempt?.status === 'failed'}
            />
            {active && (
              <path
                key={event?.id}
                className={`gateway-topology-traffic tone-${transfer?.tone}`}
                d={backwards ? link.reverse : link.d}
                pathLength={1}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
