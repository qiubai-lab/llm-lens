import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Square,
} from 'lucide-react';
import { agentScenes, type Branch } from '../../core/agent-conversation/fixtures';
import { sceneHref } from '../../app/route';
import { Concept } from '../../components/Concept';
import { useAgentPlayback } from './useAgentPlayback';
import { AgentChat } from './AgentChat';
import { LocalPanel, RemotePanel } from './Panels';
import { DataFlight } from './DataFlight';

export function AgentDeck({ scene, suspended }: { scene: number; suspended: boolean }) {
  const [branch, setBranch] = useState<Branch>('normal');
  // Remount the replay at a branch/scene boundary so no old cursor can affect new data.
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
  const [detail, setDetail] = useState('local');
  const gen = useAgentPlayback(scene, branch, suspended);
  const previous = useRef(gen.cursor);
  const forward = gen.cursor === previous.current + 1;
  useEffect(() => {
    previous.current = gen.cursor;
  }, [gen.cursor]);
  useEffect(() => {
    const navigate = (e: KeyboardEvent) => {
      if (
        e.defaultPrevented ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        !(e.target instanceof Element) ||
        e.target.closest(
          'input,textarea,select,button,a,[role="dialog"],[data-radix-popper-content-wrapper]',
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
  const ended = gen.cursor === gen.lesson.events.length;
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
            <button className="title-replay" aria-label="重播当前幕" onClick={gen.reset}>
              <RotateCcw size={16} />
            </button>
          </div>
          <p>
            {current.description}{' '}
            <Concept title="本幕要点" compact>
              {current.insight}
            </Concept>
          </p>
        </div>
      </div>
      <div className="agent-stage-slot">
        <div className="agent-stage-content">
          <div className="agent-stage-caption">
            <span className="stage-tag">
              <i /> 教学模拟 · 不发送真实请求
            </span>
            <span>蓝：请求　紫：模型输出　绿：已接收</span>
          </div>
          <div className="agent-detail-tabs" aria-label="数据流详情">
            <button aria-pressed={detail === 'local'} onClick={() => setDetail('local')}>
              Agent 本地 · {gen.state.executionCount} 次读取
            </button>
            <button aria-pressed={detail === 'remote'} onClick={() => setDetail('remote')}>
              模型通信 · {gen.state.requests.length} 轮请求
            </button>
          </div>
          <div className={`agent-stage detail-${detail}`}>
            <LocalPanel state={gen.state} />
            <AgentChat
              state={gen.state}
              question={gen.lesson.question}
              playing={gen.playing}
              cancelled={gen.cancelled}
              canPlay={!ended && !suspended}
              onPlay={gen.toggle}
              onCancel={gen.cancel}
            />
            <RemotePanel state={gen.state} />
            <DataFlight event={gen.state.last} forward={forward} />
          </div>
          <div className="agent-playback">
            <div className="agent-playback-buttons">
              <button
                className="button primary"
                onClick={gen.toggle}
                disabled={ended || gen.cancelled || suspended}
              >
                {gen.playing ? <Pause size={15} /> : <Play size={15} />}{' '}
                {gen.playing ? '暂停' : '播放'}
              </button>
              <button
                className="button secondary"
                onClick={gen.step}
                disabled={ended || gen.cancelled || suspended}
              >
                <SkipForward size={15} /> 单步
              </button>
              <button
                className="icon-button"
                aria-label="停止教学任务"
                onClick={gen.cancel}
                disabled={gen.cancelled || ended}
              >
                <Square size={14} />
              </button>
            </div>
            <label className="agent-timeline">
              回看步骤{' '}
              <input
                type="range"
                min={gen.lesson.initialCursor}
                max={gen.lesson.events.length}
                value={gen.cursor}
                disabled={gen.cancelled}
                onChange={(e) => gen.seek(Number(e.target.value))}
                aria-label="回看步骤"
              />
              <output>
                {gen.cursor} / {gen.lesson.events.length}
              </output>
            </label>
            {(scene === 3 || scene === 5) && (
              <label className="agent-branch">
                教学分支
                <select value={branch} onChange={(e) => onBranch(e.target.value as Branch)}>
                  <option value="normal">正常完成</option>
                  {scene === 3 && <option value="file-error">文件读取失败</option>}
                  {scene === 5 && <option value="interrupted">流响应中断</option>}
                </select>
              </label>
            )}
          </div>
          <div className="agent-step-note" role="status">
            <strong>
              {gen.cancelled
                ? '任务已取消'
                : ended
                  ? '本幕演示结束'
                  : gen.playing
                    ? '回放进行中'
                    : '可单步观察'}
            </strong>
            <span>{gen.state.last?.label ?? '从中央对话框发送预设问题。'}</span>
          </div>
        </div>
      </div>
      <div className="scene-feedback">
        <Lightbulb size={15} />
        <span>{current.insight}</span>
      </div>
      <footer className="deck-navigation">
        <a
          className="button text-button deck-nav-link"
          href={scene === 0 ? '#/' : sceneHref(scene - 1, 'agent')}
        >
          <ChevronLeft size={17} />
          {scene === 0 ? '首页' : '上一幕'}
        </a>
        <div className="scene-progress" aria-label="演示进度">
          {agentScenes.map((s, i) => (
            <a
              key={s.short}
              href={sceneHref(i, 'agent')}
              aria-label={`第 ${i + 1} 幕：${s.short}`}
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
          {scene < 5 ? '下一幕' : '回到首页'}
          <ChevronRight size={17} />
        </a>
      </footer>
    </main>
  );
}
