import {
  ArrowRight,
  Check,
  FileText,
  KeyRound,
  LockKeyhole,
  Send,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import { useCalmMotion } from '../../components/MotionPreference';
import { channelNames, type GatewayState, type Scenario } from '../../core/model-gateway/flow';

// Presentation only: animations never advance events or mutate billing.
export function GatewayStepVisual({
  state: s,
  scenario,
  random,
  running,
  immediate,
}: {
  state: GatewayState;
  scenario: Scenario;
  random: number;
  running: boolean;
  immediate: boolean;
}) {
  const reduced = useCalmMotion();
  const step = s.last?.step ?? 0;
  const rejected = s.response === 'rejected';
  const localError = rejected && step < 5;
  const converted = s.selected?.protocol === 'Messages';
  const model = s.selected?.model ?? '等待选路';
  return (
    <div
      className="gateway-step-visual"
      data-step={step}
      data-static={immediate || reduced}
      data-paused={!running}
    >
      <div key={s.last?.id ?? 'ready'} className="gateway-visual-scene">
        {step === 0 && (
          <div className="gateway-packet-scene">
            <div className="gateway-packet-source">
              <span className="gateway-mini-avatar">
                <Send size={20} />
              </span>
              <span>应用请求</span>
            </div>
            <div className="gateway-moving-packet">
              <FileText size={21} />
              <span>问题 + 模型 + 令牌</span>
            </div>
            <div className="gateway-intake">
              <span className="gateway-intake-slot" />
              <strong>统一入口</strong>
              <code>/v1/chat/completions</code>
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="gateway-auth-scene">
            <div className="gateway-key-card">
              <KeyRound size={25} />
              <span>网关令牌</span>
              <code>•••• demo</code>
            </div>
            <div className={`gateway-auth-gate ${localError ? 'is-error' : ''}`}>
              <ShieldCheck size={32} />
              <span>{localError ? '拒绝访问' : '验证身份'}</span>
              <div className="gateway-scan-beam" />
            </div>
            <div className="gateway-auth-result">
              {localError ? <X size={25} /> : <Check size={25} />}
              <strong>{localError ? '401' : 'learning'}</strong>
              <span>{localError ? '不进入上游' : '允许的分组'}</span>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="gateway-route-scene">
            <div className="gateway-route-input">
              <GitNode />
              <code>demo-chat</code>
              <small>{s.rate ? '频率检查通过' : '频率受限'}</small>
            </div>
            <div className="gateway-route-lanes">
              {(scenario === 'convert' ? ['D'] : ['A', 'B', 'C']).map((id) => (
                <div
                  key={id}
                  className="gateway-route-lane"
                  data-picked={s.selected?.id === id}
                  data-excluded={localError}
                >
                  <span className="gateway-route-wire" />
                  <span className="gateway-route-dot">{channelNames[id]}</span>
                  <span>
                    {id === 'C'
                      ? 'Messages · 备用'
                      : id === 'D'
                        ? 'Messages 渠道'
                        : `优先级 10 · ${id === 'A' ? '70%' : '30%'}`}
                  </span>
                  {s.selected?.id === id ? (
                    <Check size={16} />
                  ) : localError ? (
                    <X size={16} />
                  ) : (
                    <span className="gateway-route-wait" />
                  )}
                </div>
              ))}
            </div>
            <div className="gateway-route-caption">
              {localError
                ? `${s.status} · 本次请求在网关停止`
                : scenario === 'strict'
                  ? '固定 GPT 渠道 · 不参与权重选择'
                  : scenario === 'convert'
                    ? '按分组与模型筛选可用渠道'
                    : s.selected?.id === 'C'
                      ? '主渠道失败 → 进入备用层'
                      : `同层抽样 ${random.toFixed(2)} → ${s.selected ? channelNames[s.selected.id] : '等待选择'}`}
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="gateway-budget-scene">
            <div className="gateway-money-box">
              <Wallet size={22} />
              <span>可用额度</span>
              <strong>{s.available}</strong>
              <div className="gateway-money-stack">
                {[0, 1, 2, 3, 4].map((i) => (
                  <i key={i} />
                ))}
              </div>
            </div>
            <div className="gateway-budget-transfer">
              <span>{localError ? '不足以预留' : s.reserved ? '预留 100' : '校验请求'}</span>
              <ArrowRight size={25} />
              <small>{localError ? '不发送上游' : '不是最终消费'}</small>
            </div>
            <div className={`gateway-money-box reserve-box ${localError ? 'is-error' : ''}`}>
              <LockKeyhole size={22} />
              <span>预扣区</span>
              <strong>{s.reserved}</strong>
              <span className="gateway-reserve-coin" data-filled={s.reserved > 0}>
                {s.reserved ? '100' : '—'}
              </span>
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="gateway-transform-scene">
            <div className="gateway-transform-strip">
              <span>应用请求</span>
              <span>{localError || s.last?.kind === 'failed' ? '上游返回错误' : '上游请求'}</span>
            </div>
            <div className="gateway-transform-row">
              <span className="gateway-field-chip">demo-chat</span>
              <ArrowRight size={16} />
              <span className="gateway-field-chip changed">
                <span className="gateway-chip-old" aria-hidden="true">
                  demo-chat
                </span>
                <span className="gateway-chip-new">{model}</span>
              </span>
            </div>
            <div className="gateway-transform-row">
              <span className="gateway-field-chip">Chat Completions</span>
              <ArrowRight size={16} />
              <span className="gateway-field-chip changed">
                <span className="gateway-chip-old" aria-hidden="true">
                  Chat Completions
                </span>
                <span className="gateway-chip-new">
                  {converted ? 'Messages' : 'Chat Completions'}
                </span>
              </span>
            </div>
            <div className="gateway-key-boundary">
              <span>
                <KeyRound size={14} />
                网关令牌
              </span>
              <span className="gateway-boundary-mark">独立认证</span>
              <span>
                <KeyRound size={14} />
                上游凭据
              </span>
            </div>
            <div className="gateway-transform-result">
              {s.last?.kind === 'failed' || rejected ? (
                <>
                  <X size={16} />
                  503 · {rejected ? '停止尝试' : '判断是否重试'}
                </>
              ) : s.last?.kind === 'retry' ? (
                <>保留同一请求 · 准备下一次尝试</>
              ) : (
                <>
                  <Check size={16} />
                  {converted ? '改用 /v1/messages · x-api-key' : '问题内容保留 · 只改写所需字段'}
                </>
              )}
            </div>
          </div>
        )}
        {step === 5 && (
          <div className="gateway-stream-scene">
            <div className="gateway-stream-ends">
              <span>上游输出</span>
              <span>{s.response === 'interrupted' ? '中断 · 保留部分正文' : '应用收到'}</span>
            </div>
            <div className="gateway-stream-track">
              <span className="gateway-stream-chip">{converted ? 'text_delta' : 'delta'}</span>
              <span className="gateway-stream-relay">{converted ? '转换' : '转发'}</span>
              <span className="gateway-stream-chip">content</span>
              <span className="gateway-stream-pulse" />
            </div>
            <div className="gateway-stream-paper">
              <small>{s.response === 'completed' ? '响应结束' : '正在拼接正文'}</small>
              <p>
                {s.answer}
                <span className="gateway-text-caret" data-visible={s.response === 'streaming'} />
              </p>
            </div>
            <small className="gateway-visual-note">片段不等于 Token；网关不生成回答。</small>
          </div>
        )}
        {step === 6 && (
          <div className="gateway-settle-scene">
            <div className="gateway-settle-origin">
              <LockKeyhole size={20} />
              <span>预扣 100</span>
            </div>
            <div className="gateway-settle-branches">
              <div>
                <span className="gateway-settle-line" />
                <span>实际消耗</span>
                <strong>{s.charged}</strong>
                <small>{s.charged ? '20 × 1 + 10 × 2' : '本例无可计费用量'}</small>
              </div>
              <div>
                <span className="gateway-settle-line" />
                <span>返还额度</span>
                <strong>{s.returned}</strong>
                <small>回到可用余额</small>
              </div>
            </div>
            <span className="gateway-settle-total">
              可用额度 <strong>{s.available}</strong>
              <small>示意价格，不重复扣费</small>
            </span>
          </div>
        )}
        {step === 7 && (
          <div className="gateway-report-scene">
            <div className="gateway-report-route">
              <span className="gateway-report-node">应用</span>
              <span className="gateway-report-wire" />
              <span className="gateway-report-node">网关</span>
              <span className="gateway-report-wire" />
              <span className="gateway-report-node">
                {s.attempts.length
                  ? s.attempts.map((a) => channelNames[a.channel]).join(' → ')
                  : '未调用'}
              </span>
            </div>
            <div className="gateway-report-stamps">
              <span>{s.attempts.length} 次尝试</span>
              <span className={s.response === 'completed' ? 'success' : 'error'}>
                {s.response === 'completed' ? <Check size={16} /> : <X size={16} />}
                {s.response === 'completed'
                  ? '回答完成'
                  : s.response === 'interrupted'
                    ? '回答中断'
                    : '请求失败'}
              </span>
              <span>
                {s.billing === 'uncertain'
                  ? '账务待确认'
                  : s.billing === 'refunded'
                    ? '已退款'
                    : s.billing === 'settled'
                      ? '已结算'
                      : '未扣费'}
              </span>
            </div>
            <p>每次尝试与账单，都属于同一条请求。</p>
          </div>
        )}
      </div>
    </div>
  );
}
function GitNode() {
  return (
    <span className="gateway-route-origin">
      <Send size={19} />
    </span>
  );
}
