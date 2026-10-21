import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { agentTopic, type Branch, type Task } from '../../core/agent-conversation/fixtures';
import {
  activityTransfers,
  buildActivities,
  transferHistory,
  transferKey,
  visibleTransfers,
  activitySnapshot,
  isToolTransfer,
  activeToolCall,
  type NumberedTransfer,
} from '../../core/agent-conversation/workbench';
import { useAgentRun } from './useAgentRun';
import { AgentChat } from './AgentChat';
import { TaskSelector } from './TaskSelector';
import { LocalWorkbench } from './LocalWorkbench';
import { ServiceWorkbench } from './ServiceWorkbench';
import { RegionFocus } from './RegionFocus';
import { FlowConnections } from './FlowConnections';
import { useCalmMotion } from '../../components/MotionPreference';

// Semantic transfers stay in core; this view-only list owns retiring snapshots.
function useRetiringTransfers(transfers: NumberedTransfer[], immediate: boolean) {
  const previous = useRef<NumberedTransfer[]>([]);
  const [retiring, setRetiring] = useState<NumberedTransfer[]>([]);
  const live = new Set(transfers.map(transferKey));
  const snapshots = immediate
    ? []
    : Array.from(
        new Map(
          [...retiring, ...previous.current]
            .filter((t) => !live.has(transferKey(t)))
            .map((t) => [transferKey(t), t]),
        ).values(),
      );
  useLayoutEffect(() => {
    previous.current = transfers;
    setRetiring((old) =>
      old.length === snapshots.length &&
      old.every((t, i) => transferKey(t) === transferKey(snapshots[i]))
        ? old
        : snapshots,
    );
  }, [transfers, immediate]);
  const remove = useCallback(
    (key: string) => setRetiring((old) => old.filter((t) => transferKey(t) !== key)),
    [],
  );
  return { snapshots, live, remove };
}
export function AgentDeck({ suspended }: { suspended: boolean }) {
  const [branch, setBranch] = useState<Branch>('normal');
  const [task, setTask] = useState<Task>('save-summary');
  const [taskLocked, setTaskLocked] = useState(false);
  return (
    <main className="deck-page agent-deck" id="main-content">
      <div className="deck-heading">
        <div>
          <div className="eyebrow">{agentTopic.scenes[0].kicker}</div>
          <div className="deck-title-row">
            <h1>{agentTopic.scenes[0].title}</h1>
          </div>
        </div>
        <TaskSelector task={task} onTask={setTask} disabled={taskLocked || suspended} />
      </div>
      <AgentLesson
        key={`${branch}-${task}`}
        branch={branch}
        onBranch={setBranch}
        task={task}
        onTaskLocked={setTaskLocked}
        suspended={suspended}
      />
    </main>
  );
}
function AgentLesson({
  branch,
  onBranch,
  suspended,
  task,
  onTaskLocked,
}: {
  branch: Branch;
  onBranch: (b: Branch) => void;
  suspended: boolean;
  task: Task;
  onTaskLocked: (locked: boolean) => void;
}) {
  const [selectedId, setSelectedId] = useState<string>();
  const [detailId, setDetailId] = useState<string>();
  const paused = suspended || Boolean(detailId);
  const run = useAgentRun(5, branch, paused, task);
  useEffect(() => onTaskLocked(run.busy || paused), [run.busy, paused, onTaskLocked]);
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
  const baseTransfers = useMemo(
    () => visibleTransfers(run.lesson, run.cursor, selectedId),
    [run.lesson, run.cursor, selectedId],
  );
  const reduced = useCalmMotion();
  const immediate = reduced || Boolean(selectedId) || paused || run.cancelled;
  const focus = selectedId ? related[0] : history.at(-1);
  const latestKey = history.length ? transferKey(history[history.length - 1]) : undefined;
  const relatedKeys = new Set(related.map(transferKey));
  const side = (t: (typeof history)[number]) =>
    isToolTransfer(t) || t.kind === 'content' ? 'local' : 'server';
  const displayState = useMemo(
    () => (selectedId ? activitySnapshot(run.lesson, run.cursor, selectedId) : run.state),
    [run.lesson, run.cursor, run.state, selectedId],
  );
  const toolCall = selectedId
    ? displayState.calls.find((c) => c.callId === card?.callId)
    : activeToolCall(run.lesson, run.cursor);
  const inspectionPath = toolCall?.path;
  const writeCreated =
    toolCall?.name === 'write_file' &&
    Boolean(toolCall.path) &&
    Object.hasOwn(displayState.files, toolCall.path!);
  const semanticTransfers = useMemo(
    () =>
      baseTransfers.map((transfer) =>
        transfer.kind === 'execute' && toolCall?.name === 'write_file'
          ? {
              ...transfer,
              to: writeCreated ? `preview-${toolCall.path}` : transfer.to,
              label: writeCreated ? '写入文件' : '创建文件',
            }
          : transfer,
      ),
    [baseTransfers, toolCall?.name, toolCall?.path, writeCreated],
  );
  const operation = semanticTransfers.find((t) => t.kind === 'execute');
  const operationKey = operation && transferKey(operation);
  const [fileArrived, setFileArrived] = useState<string>();
  const [previewArrived, setPreviewArrived] = useState<string>();
  // These are presentation arrivals, never additional replay/execution events.
  const staticContent = reduced || Boolean(selectedId);
  useLayoutEffect(() => {
    setFileArrived(undefined);
    setPreviewArrived(undefined);
  }, [operationKey]);
  const contentTransfer = useMemo<NumberedTransfer | undefined>(() => {
    if (
      !operation ||
      !toolCall?.path ||
      (toolCall.name !== 'read_file' && !writeCreated) ||
      (!staticContent && fileArrived !== operationKey)
    )
      return;
    return {
      id: `${operation.id}-content`,
      kind: 'content',
      from: `file-${toolCall.path}`,
      to: `preview-${toolCall.path}`,
      fromArea: 'local',
      toArea: 'local',
      label: writeCreated ? '写入内容' : '获取文件内容',
      tone: 'green',
      sequence: operation.sequence + 0.5,
    };
  }, [operation, toolCall, staticContent, fileArrived, operationKey, writeCreated]);
  const transfers = useMemo(
    () => (contentTransfer ? [...semanticTransfers, contentTransfer] : semanticTransfers),
    [semanticTransfers, contentTransfer],
  );
  const retirement = useRetiringTransfers(transfers, immediate);
  const previewReady =
    staticContent ||
    (toolCall?.name === 'read_file' || writeCreated ? previewArrived : fileArrived) ===
      operationKey;
  const previewPath =
    operation &&
    previewReady &&
    (operation.to.startsWith('file-') || operation.to.startsWith('preview-'))
      ? toolCall?.path
      : undefined;
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
    <section
      className="agent-stage-slot"
      role="tabpanel"
      id="agent-task-panel"
      aria-labelledby={`agent-task-${task}`}
    >
      <div className="agent-stage-content">
        <div
          className="agent-stage"
          style={
            {
              '--server-flow-count': completeHistory.filter((t) => side(t) === 'server').length,
            } as CSSProperties
          }
          data-related-areas={
            selectedId
              ? Array.from(new Set(related.flatMap((t) => [t.fromArea, t.toArea]))).join(' ')
              : undefined
          }
        >
          <LocalWorkbench
            state={displayState}
            branch={branch}
            onBranch={onBranch}
            canConfigure={!run.busy}
            inspectionPath={inspectionPath}
            inspecting={Boolean(selectedId)}
            previewPath={previewPath}
            writeCall={writeCreated ? toolCall : undefined}
            writeReady={previewReady}
            motionPaused={paused || !run.busy || run.cancelled || Boolean(selectedId)}
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
            toolCall={toolCall}
            inspecting={Boolean(selectedId)}
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
              relatedAnchors={selectedId ? related.flatMap((t) => [t.from, t.to]) : undefined}
            />
          )}
          {[...transfers, ...retirement.snapshots]
            .sort((a, b) => a.sequence - b.sequence)
            .map((transfer) => (
              <FlowConnections
                key={transferKey(transfer)}
                retiring={!retirement.live.has(transferKey(transfer))}
                immediate={immediate}
                onRetired={() => retirement.remove(transferKey(transfer))}
                onArrived={
                  retirement.live.has(transferKey(transfer))
                    ? () => {
                        if (transfer.kind === 'execute') setFileArrived(operationKey);
                        if (transfer.kind === 'content') setPreviewArrived(operationKey);
                      }
                    : undefined
                }
                transfer={transfer}
                sequence={transfer.kind === 'content' ? undefined : transfer.sequence}
                laneIndex={(side(transfer) === 'local' ? transfers : completeHistory)
                  .filter((t) => side(t) === side(transfer))
                  .findIndex((t) => transferKey(t) === transferKey(transfer))}
                laneCount={
                  (side(transfer) === 'local' ? transfers : completeHistory).filter(
                    (t) => side(t) === side(transfer),
                  ).length
                }
                emphasized={
                  transfer.kind === 'content'
                    ? true
                    : selectedId
                      ? relatedKeys.has(transferKey(transfer))
                      : transferKey(transfer) === latestKey
                }
                reveal={!selectedId && !paused && !run.cancelled}
                active={!selectedId && run.busy && !run.gate && transferKey(transfer) === latestKey}
              />
            ))}
        </div>
      </div>
    </section>
  );
}
