import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { agentScenes, type Branch } from '../../core/agent-conversation/fixtures';
import { buildActivities, currentTransfer } from '../../core/agent-conversation/workbench';
import { sceneHref } from '../../app/route';
import { useAgentRun } from './useAgentRun';
import { AgentChat } from './AgentChat';
import { LocalWorkbench } from './LocalWorkbench';
import { ServiceWorkbench } from './ServiceWorkbench';
import { FlowConnections } from './FlowConnections';
export function AgentDeck({ scene, suspended }: { scene: number; suspended: boolean }) {
  const [branch, setBranch] = useState<Branch>('normal');
  return (
    <AgentLesson
      key={`${scene}-${branch}`}
      scene={scene}
      branch={branch}
      onBranch={setBranch}
      suspended={suspended}
    />
  );
}
function AgentLesson({
  scene,
  branch,
  onBranch,
  suspended,
}: {
  scene: number;
  branch: Branch;
  onBranch: (b: Branch) => void;
  suspended: boolean;
}) {
  const run = useAgentRun(scene, branch, suspended);
  const activities = useMemo(
    () => buildActivities(run.lesson, run.cursor),
    [run.lesson, run.cursor],
  );
  const transfer = useMemo(() => currentTransfer(run.lesson, run.cursor), [run.lesson, run.cursor]);
  useEffect(() => {
    const navigate = (e: KeyboardEvent) => {
      if (
        e.defaultPrevented ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        !(e.target instanceof Element) ||
        e.target.closest(
          'input,textarea,select,button,a,summary,[role="dialog"],[data-radix-popper-content-wrapper]',
        ) ||
        document.querySelector('[role="dialog"]')
      )
        return;
      if (e.key === 'ArrowRight' && scene < 5) {
        e.preventDefault();
        location.hash = sceneHref(scene + 1, 'agent');
      }
      if (e.key === 'ArrowLeft' && scene > 0) {
        e.preventDefault();
        location.hash = sceneHref(scene - 1, 'agent');
      }
    };
    window.addEventListener('keydown', navigate);
    return () => window.removeEventListener('keydown', navigate);
  }, [scene]);
  const current = agentScenes[scene];
  return (
    <main className="deck-page agent-deck" id="main-content">
      <div className="deck-heading">
        <div>
          <div className="eyebrow">
            {current.kicker}
            <span>{String(scene + 1).padStart(2, '0')} / 06</span>
          </div>
          <div className="deck-title-row">
            <h1>{current.title}</h1>
          </div>
        </div>
        <span className="workbench-simulation">
          <i /> 教学模拟
        </span>
      </div>
      <div className="agent-stage-slot">
        <div className="agent-stage-content">
          <div className="agent-stage">
            <LocalWorkbench
              state={run.state}
              gate={run.cancelled || suspended ? undefined : run.gate}
              onExecute={run.execute}
              branch={branch}
              onBranch={scene === 3 ? onBranch : undefined}
              canConfigure={!run.busy}
            />
            <AgentChat
              state={run.state}
              question={run.lesson.question}
              busy={run.busy}
              cancelled={run.cancelled}
              ended={run.ended}
              phase={run.phase}
              gate={run.gate}
              suspended={suspended}
              onSend={run.send}
              onStop={run.stop}
              onExecute={run.execute}
              onReset={run.reset}
              interrupt={branch === 'interrupted'}
              onInterrupt={
                scene === 5
                  ? () => onBranch(branch === 'interrupted' ? 'normal' : 'interrupted')
                  : undefined
              }
            />
            <ServiceWorkbench activities={activities} status={run.phase} />
            <FlowConnections transfer={transfer} active={run.busy && !run.gate} />
          </div>
        </div>
      </div>
      <footer className="deck-navigation">
        <a
          className="button text-button deck-nav-link"
          href={scene === 0 ? '#/' : sceneHref(scene - 1, 'agent')}
        >
          <ChevronLeft size={17} />
          {scene === 0 ? '首页' : '上一章'}
        </a>
        <div className="scene-progress" aria-label="章节进度">
          {agentScenes.map((s, i) => (
            <a
              key={s.short}
              href={sceneHref(i, 'agent')}
              aria-label={`第 ${i + 1} 章：${s.short}`}
              aria-current={scene === i ? 'step' : undefined}
              className={i <= scene ? 'visited' : ''}
            >
              <span />
            </a>
          ))}
          <span>{String(scene + 1).padStart(2, '0')} / 06</span>
        </div>
        <a
          className="button text-button deck-nav-link"
          href={scene < 5 ? sceneHref(scene + 1, 'agent') : '#/'}
        >
          {scene < 5 ? '下一章' : '回到首页'}
          <ChevronRight size={17} />
        </a>
      </footer>
    </main>
  );
}
