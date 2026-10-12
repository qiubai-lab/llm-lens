import { useEffect, useMemo, useState } from 'react';
import { agentTopic, type Branch } from '../../core/agent-conversation/fixtures';
import {
  activityTransfers,
  buildActivities,
  transferHistory,
  transferKey,
} from '../../core/agent-conversation/workbench';
import { useAgentRun } from './useAgentRun';
import { AgentChat } from './AgentChat';
import { LocalWorkbench } from './LocalWorkbench';
import { ServiceWorkbench } from './ServiceWorkbench';
import { RegionFocus } from './RegionFocus';
import { FlowConnections } from './FlowConnections';
export function AgentDeck({ suspended }: { suspended: boolean }) {
  const [branch, setBranch] = useState<Branch>('normal');
  return <AgentLesson key={branch} branch={branch} onBranch={setBranch} suspended={suspended} />;
}
function AgentLesson({
  branch,
  onBranch,
  suspended,
}: {
  branch: Branch;
  onBranch: (b: Branch) => void;
  suspended: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string>();
  const [detailId, setDetailId] = useState<string>();
  const paused = suspended || Boolean(detailId);
  const run = useAgentRun(5, branch, paused);
  const activities = useMemo(
    () => buildActivities(run.lesson, run.cursor),
    [run.lesson, run.cursor],
  );
  const card = activities.find((c) => c.id === selectedId);
  const history = useMemo(() => transferHistory(run.lesson, run.cursor), [run.lesson, run.cursor]);
  const completeHistory = useMemo(
    () => transferHistory(run.lesson, run.lesson.events.length),
    [run.lesson],
  );
  const related = useMemo(
    () => (selectedId ? activityTransfers(run.lesson, run.cursor, selectedId) : []),
    [run.lesson, run.cursor, selectedId],
  );
  const transfers = [...history];
  for (const preview of related) {
    if (!history.some((t) => transferKey(t) === transferKey(preview))) {
      const sequence = completeHistory.find(
        (t) => transferKey(t) === transferKey(preview),
      )?.sequence;
      if (sequence) transfers.push({ ...preview, sequence });
    }
  }
  const focus = selectedId ? related[0] : history.at(-1);
  const relatedKeys = new Set(related.map(transferKey));
  const side = (t: (typeof history)[number]) =>
    t.fromArea === 'local' || t.toArea === 'local' ? 'local' : 'server';
  const inspectionPath = run.state.calls.find((c) => c.callId === card?.callId)?.path;
  useEffect(() => {
    if (!selectedId) return;
    const anchors = related.filter((t) => t.fromArea === 'chat' || t.toArea === 'chat');
    const name = anchors[0]?.fromArea === 'chat' ? anchors[0].from : anchors[0]?.to;
    const el = Array.from(document.querySelectorAll<HTMLElement>('[data-flow-anchor]')).find(
      (e) => e.dataset.flowAnchor === name,
    );
    const scroll = el?.closest<HTMLElement>('.agent-chat-scroll');
    if (el && scroll)
      scroll.scrollTop += el.getBoundingClientRect().top - scroll.getBoundingClientRect().top - 20;
  }, [selectedId]);
  const act = (action: () => void) => {
    setSelectedId(undefined);
    action();
  };
  return (
    <main className="deck-page agent-deck" id="main-content">
      <div className="deck-heading">
        <div>
          <div className="eyebrow">{agentTopic.scenes[0].kicker}</div>
          <div className="deck-title-row">
            <h1>{agentTopic.scenes[0].title}</h1>
          </div>
        </div>
        <span className="workbench-simulation">
          <i /> 教学模拟
        </span>
      </div>
      <div className="agent-stage-slot">
        <div className="agent-stage-content">
          <div
            className="agent-stage"
            data-related-areas={
              selectedId
                ? Array.from(new Set(related.flatMap((t) => [t.fromArea, t.toArea]))).join(' ')
                : undefined
            }
          >
            <LocalWorkbench
              state={run.state}
              gate={run.cancelled || paused ? undefined : run.gate}
              onExecute={() => act(run.execute)}
              branch={branch}
              onBranch={onBranch}
              canConfigure={!run.busy}
              inspectionPath={inspectionPath}
            />
            <AgentChat
              state={run.state}
              question={run.lesson.question}
              busy={run.busy}
              cancelled={run.cancelled}
              ended={run.ended}
              phase={run.phase}
              gate={run.gate}
              suspended={paused}
              onSend={() => act(run.send)}
              onStop={run.stop}
              onExecute={() => act(run.execute)}
              onReset={() => act(run.reset)}
              interrupt={branch === 'interrupted'}
              onInterrupt={() => onBranch(branch === 'interrupted' ? 'normal' : 'interrupted')}
            />
            <ServiceWorkbench
              activities={activities}
              status={run.phase}
              running={run.busy && !paused}
              state={run.state}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id === selectedId ? undefined : id)}
              onFollow={() => setSelectedId(undefined)}
              detailId={detailId}
              onDetails={(id) => {
                setSelectedId(id);
                setDetailId(id);
              }}
              onCloseDetails={() => setDetailId(undefined)}
            />
            {focus && (
              <RegionFocus
                transfer={focus}
                inspecting={Boolean(selectedId)}
                paused={paused || run.cancelled}
                anchor={selectedId ?? focus.to}
              />
            )}
            {transfers.map((transfer) => (
              <FlowConnections
                key={transferKey(transfer)}
                transfer={transfer}
                sequence={transfer.sequence}
                laneIndex={completeHistory
                  .filter((t) => side(t) === side(transfer))
                  .findIndex((t) => transferKey(t) === transferKey(transfer))}
                laneCount={completeHistory.filter((t) => side(t) === side(transfer)).length}
                emphasized={
                  selectedId
                    ? relatedKeys.has(transferKey(transfer))
                    : transferKey(transfer) === transferKey(history.at(-1)!)
                }
                reveal={!selectedId && !paused && !run.cancelled}
                active={
                  !selectedId &&
                  run.busy &&
                  !run.gate &&
                  transferKey(transfer) === transferKey(history.at(-1)!)
                }
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
