import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ChevronRight,
  Code2,
  KeyRound,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Send,
  Server,
  SkipForward,
  X,
} from 'lucide-react';
import { useCalmMotion } from '../../components/MotionPreference';
import { Concept } from '../../components/Concept';
import {
  channels,
  channelNames,
  conversionChannel,
  requestBody,
  scenarios,
  steps,
  upstreamBody,
  type Scenario,
} from '../../core/model-gateway/flow';
import { useGatewayRun } from './useGatewayRun';
import { GatewayStepVisual } from './GatewayStepVisual';
import { GatewayConnections } from './GatewayConnections';
import '../../styles/gateway.css';

const responseNames = {
  idle: '等待发送',
  waiting: '等待响应',
  streaming: '正在接收',
  completed: '回答完成',
  rejected: '请求被拒绝',
  interrupted: '回答未完成',
};
const billingNames = {
  none: '尚未预扣',
  reserved: '额度已预留',
  settled: '已结算',
  refunded: '已退款',
  uncertain: '结算待确认',
};
export function GatewayDeck({ suspended }: { suspended: boolean }) {
  const [scenario, setScenario] = useState<Scenario>('normal');
  const [random, setRandom] = useState(0.2);
  const [locked, setLocked] = useState(false);
  return (
    <main className="gateway-page" id="main-content">
      <header className="gateway-heading">
        <div>
          <span className="eyebrow">BEHIND EVERY REQUEST</span>
          <h1>一次请求，如何抵达模型？</h1>
          <p>进入网关，看清访问、路由、适配与结算。</p>
        </div>
        <div className="gateway-scenario">
          <span className="gateway-simulation">
            <span className="status-dot" /> 教学模拟 · 无真实请求
          </span>
          <label>
            探索场景
            <select
              value={scenario}
              disabled={locked || suspended}
              onChange={(e) => setScenario(e.target.value as Scenario)}
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>
      <GatewayLesson
        key={`${scenario}-${random}`}
        scenario={scenario}
        random={random}
        setRandom={setRandom}
        suspended={suspended}
        onLocked={setLocked}
      />
    </main>
  );
}

function GatewayLesson({
  scenario,
  random,
  setRandom,
  suspended,
  onLocked,
}: {
  scenario: Scenario;
  random: number;
  setRandom: (value: number) => void;
  suspended: boolean;
  onLocked: (value: boolean) => void;
}) {
  const reduced = useCalmMotion();
  const [detail, setDetail] = useState(false);
  const detailTrigger = useRef<HTMLButtonElement>(null);
  const run = useGatewayRun(scenario, random, suspended || detail);
  useEffect(() => onLocked(run.cursor > 0 && !run.ended), [run.cursor, run.ended, onLocked]);
  const stage = useRef<HTMLDivElement>(null);
  const s = run.state,
    current = s.last;
  const pool = scenario === 'convert' ? [conversionChannel] : channels;
  const scenarioInfo = scenarios.find((x) => x.id === scenario)!;
  const activeStep = current?.step ?? 0;
  const hasError = s.response === 'rejected' || s.response === 'interrupted';
  const inspecting = run.selected !== null;
  const focus =
    current?.transfer?.to === 'client'
      ? 'client'
      : current?.transfer?.to?.startsWith('channel')
        ? current.transfer.to
        : 'gateway';
  const title = current?.title ?? '从应用发出一条请求';
  const explanation = current?.explanation ?? scenarioInfo.description;
  return (
    <>
      <div className="gateway-controls">
        <div className="gateway-control-main">
          <button
            className="button primary"
            disabled={suspended || detail || (run.ended && !run.running)}
            onClick={run.running ? run.pause : run.play}
          >
            {run.running ? <Pause size={16} /> : <Play size={16} />}
            {run.running ? '暂停讲解' : run.cursor ? '继续讲解' : '发送请求'}
          </button>
          <button
            className="button secondary"
            onClick={run.next}
            disabled={suspended || detail || (run.ended && !inspecting)}
          >
            <SkipForward size={16} />
            下一步
          </button>
          <button
            className="icon-button"
            aria-label="重置演示"
            title="重置后可更换场景"
            onClick={run.reset}
            disabled={suspended || detail}
          >
            <RotateCcw size={17} />
          </button>
        </div>
        <span className="gateway-run-status" role="status">
          {inspecting
            ? '历史快照 · 只读'
            : run.ended
              ? '演示结束'
              : run.running
                ? '讲解播放中'
                : run.cursor
                  ? '已暂停 · 重置后可切换场景'
                  : '准备就绪'}
          <small>动画时长不代表网络延迟</small>
        </span>
        <button
          className="button text-button"
          ref={detailTrigger}
          onClick={() => {
            run.pause();
            setDetail(true);
          }}
        >
          <Code2 size={16} />
          查看数据
        </button>
      </div>
      <div className="gateway-mobile-summary">
        <div className="gateway-title-slot">
          {run.events.map((e) => (
            <strong key={e.id} aria-hidden="true" className="gateway-reserve">
              {e.title}
            </strong>
          ))}
          <strong>{title}</strong>
        </div>
        <button
          onClick={() => {
            const target = document.querySelector<HTMLElement>('.gateway-current');
            target?.scrollIntoView({ block: 'start', behavior: 'instant' });
            target?.focus({ preventScroll: true });
          }}
        >
          查看网关当前步骤 <ChevronRight size={14} />
        </button>
      </div>
      <div className="gateway-composition">
        <ol className="gateway-progress" aria-label="请求流程">
          {steps.map((step, i) => {
            const reached = run.events
              .slice(0, run.cursor)
              .reduce((last, e, index) => (e.step === i ? index : last), -1);
            return (
              <li
                key={step}
                aria-current={activeStep === i ? 'step' : undefined}
                data-past={reached >= 0 && activeStep !== i}
              >
                <button
                  disabled={reached < 0 || suspended || detail}
                  onClick={() => run.inspect(reached)}
                  aria-label={`回看步骤 ${i + 1}：${step}`}
                >
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  {step}
                </button>
              </li>
            );
          })}
        </ol>
        <div
          className="gateway-stage"
          ref={stage}
          data-running={run.motionRunning}
          data-inspecting={inspecting}
        >
          <section className="gateway-panel gateway-client" data-gateway-anchor="client">
            <div className="gateway-panel-title">
              <span>
                <span className="gateway-chat-avatar">
                  <Layers size={18} />
                </span>
                Lens Agent
              </span>
              <span className="gateway-chat-presence">模拟会话</span>
            </div>
            <div className="gateway-chat-thread">
              <div className="gateway-chat-user">
                <span>你</span>
                <p>用一句话解释模型网关。</p>
              </div>
              <div className={`gateway-chat-assistant ${hasError ? 'is-error' : ''}`}>
                <span>
                  <Layers size={14} />
                  Agent <small>{responseNames[s.response]}</small>
                </span>
                <p data-testid="gateway-answer">
                  {s.answer ||
                    (s.response === 'rejected'
                      ? `${s.status} · 请求未完成`
                      : s.response === 'idle'
                        ? '发送一条消息，看看它如何经过网关。'
                        : '正在等待模型返回…')}
                </p>
                {s.response === 'waiting' && (
                  <span className="gateway-chat-wait" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
                {s.response === 'interrupted' && <small>连接中断 · 已接收内容保留</small>}
              </div>
            </div>
            <div className="gateway-chat-compose">
              <label htmlFor="gateway-prompt" className="gateway-label">
                预设消息
              </label>
              <textarea id="gateway-prompt" readOnly value="用一句话解释模型网关。" rows={2} />
              <div>
                <span>
                  <span className="status-dot" />
                  demo-chat
                </span>
                <button
                  className="gateway-chat-send"
                  aria-label="发送预设消息"
                  disabled={run.cursor > 0 || suspended || detail}
                  onClick={run.play}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
            <div className="gateway-chat-footer">
              <KeyRound size={12} />
              通过网关访问模型
            </div>
          </section>
          <section
            className="gateway-panel gateway-engine"
            data-gateway-anchor="gateway"
            data-focused={focus === 'gateway'}
          >
            <div className="gateway-panel-title">
              <span>
                <Layers size={17} />
                模型网关
              </span>
              <span className="gateway-tag">NEW API · 原理演示</span>
            </div>
            <section
              className="gateway-account"
              aria-label="用户额度与扣费"
              data-billing={s.billing}
              data-static={reduced || !run.animate}
            >
              <div className="gateway-account-values">
                {[
                  ['可用额度', s.available],
                  ['预扣锁定', s.reserved],
                  ['实际扣除', s.billing === 'uncertain' ? '待确认' : s.charged],
                  ['已返还', s.returned],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong key={value}>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="gateway-balance-bar" aria-hidden="true">
                <span
                  className="available"
                  style={{ width: `${(s.available / s.initial) * 100}%` }}
                />
                <span
                  className="reserved"
                  style={{ width: `${(s.reserved / s.initial) * 100}%` }}
                />
                <span className="charged" style={{ width: `${(s.charged / s.initial) * 100}%` }} />
              </div>
              <small>{billingNames[s.billing]} · 教学额度</small>
            </section>
            <div className="gateway-panel-body">
              <div className={`gateway-current ${hasError ? 'is-error' : ''}`} tabIndex={-1}>
                <div className="gateway-current-meta">
                  <div className="gateway-step-trail" aria-label={`当前 Step ${activeStep + 1}`}>
                    {steps.map((name, i) => (
                      <span
                        key={name}
                        data-active={i === activeStep}
                        data-done={
                          i !== activeStep &&
                          run.events.slice(0, run.visibleCursor).some((e) => e.step === i)
                        }
                      >
                        Step {i + 1}
                      </span>
                    ))}
                  </div>
                  <span>{current?.transfer?.label ?? '网关内部处理'}</span>
                </div>
                <div className="gateway-title-slot">
                  {run.events.map((e) => (
                    <h2 key={e.id} aria-hidden="true" className="gateway-reserve">
                      {e.title}
                    </h2>
                  ))}
                  <h2>{title}</h2>
                </div>
                <GatewayStepVisual
                  state={s}
                  scenario={scenario}
                  random={random}
                  running={run.motionRunning}
                  immediate={!run.animate}
                />
                <div className="gateway-copy-slot">
                  {run.events.map((e) => (
                    <p key={e.id} aria-hidden="true" className="gateway-reserve">
                      {e.explanation}
                    </p>
                  ))}
                  <p role="status">{explanation}</p>
                </div>
              </div>
            </div>
          </section>
          <section className="gateway-panel gateway-upstreams">
            <div className="gateway-panel-title">
              <span>
                <Server size={16} />
                上游服务
              </span>
              <span className="tiny-label">UPSTREAM</span>
            </div>
            <div className="gateway-panel-body">
              <div className="gateway-section-label">
                <span>分组 learning</span>
                <Concept title="优先级与权重" compact>
                  本例先选最高优先级，再按同层权重抽样。失败后的第二次尝试进入较低优先级；不保证永远换到未尝试的渠道。
                </Concept>
              </div>
              <div className="gateway-channel-list">
                {pool.map((c) => {
                  const attempt = s.attempts.filter((a) => a.channel === c.id).at(-1);
                  const excluded = scenario === 'unavailable' && s.rate;
                  const status = excluded
                    ? '不满足条件'
                    : attempt?.status === 'failed'
                      ? '503 · 尝试失败'
                      : attempt?.status === 'completed'
                        ? '响应完成'
                        : attempt?.status === 'interrupted'
                          ? '流已中断'
                          : attempt
                            ? '已调用'
                            : s.selected?.id === c.id
                              ? '已选中 · 未调用'
                              : c.priority < 10
                                ? '备用层'
                                : '候选';
                  return (
                    <div
                      key={c.id}
                      className="gateway-channel"
                      data-selected={s.selected?.id === c.id}
                      data-failed={attempt?.status === 'failed' || excluded}
                      data-focused={focus === `channel-${c.id}`}
                      data-gateway-anchor={`channel-${c.id}`}
                    >
                      <div>
                        <strong>
                          <span className="gateway-channel-id">
                            {channelNames[c.id].slice(0, 1)}
                          </span>
                          {channelNames[c.id]}
                        </strong>
                        <span className="gateway-tag">{status}</span>
                      </div>
                      <code>{c.model}</code>
                      <div className="gateway-channel-meta">
                        <span>{c.protocol}</span>
                        <span>
                          优先级 {c.priority} · 权重 {c.weight}
                        </span>
                      </div>
                      <div className="gateway-weight" aria-hidden="true">
                        <span style={{ width: `${c.weight}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <label className="gateway-random">
                教学抽样值
                <select
                  aria-label="教学抽样值"
                  value={random}
                  disabled={
                    run.cursor > 0 || scenario === 'convert' || scenario === 'strict' || suspended
                  }
                  onChange={(e) => setRandom(Number(e.target.value))}
                >
                  <option value={0.2}>0.20 → GPT</option>
                  <option value={0.85}>0.85 → DeepSeek</option>
                </select>
              </label>
              <p className="gateway-footnote">固定教学抽样，不是实测分流比例。模型名均为占位符。</p>
            </div>
          </section>
          <GatewayConnections
            stage={stage}
            event={current}
            channels={pool}
            selected={s.selected?.id}
            attempts={s.attempts}
            running={run.motionRunning}
            inspecting={!run.animate}
          />
        </div>
        {inspecting && (
          <button className="button text-button gateway-return" onClick={run.latest}>
            返回当前进度 <ChevronRight size={14} />
          </button>
        )}
      </div>
      <Dialog.Root open={detail} onOpenChange={setDetail}>
        <Dialog.Portal>
          <Dialog.Overlay className="modal-overlay" />
          <Dialog.Content
            className="gateway-detail"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              detailTrigger.current?.focus();
            }}
          >
            <div className="dialog-top">
              <span className="tiny-label">REQUEST INSPECTOR</span>
              <Dialog.Close className="icon-button" aria-label="关闭数据详情">
                <X size={20} />
              </Dialog.Close>
            </div>
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Description>
              教学数据快照。关闭后保持暂停；查看历史不会发送请求或改变账单。
            </Dialog.Description>
            <h3>客户端请求</h3>
            <pre>{JSON.stringify(requestBody, null, 2)}</pre>
            <h3>当前事件</h3>
            <pre>{JSON.stringify(current ?? { status: 'ready' }, null, 2)}</pre>
            <h3>上游请求</h3>
            <pre>
              {JSON.stringify(
                s.adapted && s.selected ? upstreamBody(s.selected) : { status: '尚未适配' },
                null,
                2,
              )}
            </pre>
            <h3>尝试记录与账务</h3>
            <pre>
              {JSON.stringify(
                {
                  attempts: s.attempts,
                  response: s.response,
                  billing: s.billing,
                  available: s.available,
                  reserved: s.reserved,
                  charged: s.billing === 'uncertain' ? null : s.charged,
                  returned: s.returned,
                },
                null,
                2,
              )}
            </pre>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
