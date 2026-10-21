// Source and teaching boundaries: docs/demos/model-gateway/TECHNICAL_DESIGN.md.
export const gatewayTopic = {
  id: 'gateway',
  title: '模型网关',
  subtitle: '一次请求，如何抵达模型',
  duration: '约 5 分钟',
  scenes: [{ short: '模型网关工作台' }],
};
export const scenarios = [
  { id: 'normal', title: '正常请求', description: '从统一入口到流式回答，走完一次请求。' },
  {
    id: 'convert',
    title: '协议转换',
    description: '应用仍使用 Chat 接口，上游改用 Messages 协议。',
  },
  { id: 'retry', title: '故障切换', description: '主渠道返回 503，按策略尝试备用渠道。' },
  { id: 'denied', title: '令牌无效', description: '在网关入口拒绝，不向上游发送。' },
  { id: 'forbidden', title: '模型无权限', description: '令牌有效，但不能访问这个模型。' },
  { id: 'limited', title: '请求限流', description: '网关的频率限制，与供应商限流不同。' },
  { id: 'unavailable', title: '无可用渠道', description: '没有满足分组和模型条件的渠道。' },
  { id: 'quota', title: '额度不足', description: '选中了渠道，不代表已经调用了上游。' },
  { id: 'exhausted', title: '重试用尽', description: '两次尝试均失败，释放本例的预扣额度。' },
  { id: 'strict', title: '固定渠道', description: '绑定单次尝试，失败后不切换其他渠道。' },
  { id: 'interrupted', title: '流中断', description: '保留部分回答，响应和账务分别标记。' },
] as const;
export type Scenario = (typeof scenarios)[number]['id'];
export type Channel = {
  id: string;
  model: string;
  protocol: string;
  priority: number;
  weight: number;
};
export const channels: Channel[] = [
  { id: 'A', model: 'gpt-demo', protocol: 'Chat', priority: 10, weight: 70 },
  { id: 'B', model: 'deepseek-demo', protocol: 'Chat', priority: 10, weight: 30 },
  { id: 'C', model: 'claude-demo', protocol: 'Messages', priority: 5, weight: 100 },
];
export const channelNames: Record<string, string> = {
  A: 'GPT',
  B: 'DeepSeek',
  C: 'Claude',
  D: 'Claude',
};
export const conversionChannel: Channel = {
  id: 'D',
  model: 'claude-demo',
  protocol: 'Messages',
  priority: 10,
  weight: 100,
};
export function selectChannel(pool: Channel[], attempt: number, random: number) {
  const priorities = [...new Set(pool.map((c) => c.priority))].sort((a, b) => b - a);
  const priority = priorities[Math.min(attempt - 1, priorities.length - 1)];
  const eligible = pool.filter((c) => c.priority === priority);
  const total = eligible.reduce((n, c) => n + c.weight, 0);
  let position = Math.min(0.999999, Math.max(0, random)) * (total || eligible.length);
  return eligible.find((c) => (position -= total ? c.weight : 1) < 0);
}
export const requestBody = {
  model: 'demo-chat',
  messages: [{ role: 'user', content: '用一句话解释模型网关。' }],
  max_tokens: 128,
  stream: true,
  stream_options: { include_usage: true },
};
export const steps = [
  '统一入口',
  '访问检查',
  '路由选择',
  '额度预留',
  '适配发送',
  '增量返回',
  '用量结算',
  '请求报告',
];
export type EventKind =
  | 'received'
  | 'access'
  | 'rate'
  | 'selected'
  | 'validated'
  | 'reserved'
  | 'adapted'
  | 'started'
  | 'delta'
  | 'completed'
  | 'settled'
  | 'failed'
  | 'retry'
  | 'rejected'
  | 'refunded'
  | 'interrupted'
  | 'finished';
export type GatewayEvent = {
  id: string;
  kind: EventKind;
  step: number;
  title: string;
  explanation: string;
  channel?: Channel;
  text?: string;
  status?: number;
  detail?: unknown;
  transfer?: { from: string; to: string; label: string; tone: 'blue' | 'green' | 'danger' };
};
export function createEvents(scenario: Scenario, random = 0.2): GatewayEvent[] {
  const events: GatewayEvent[] = [];
  const add = (
    kind: EventKind,
    step: number,
    title: string,
    explanation: string,
    extra: Partial<GatewayEvent> = {},
  ) => events.push({ id: `event-${events.length + 1}`, kind, step, title, explanation, ...extra });
  const reject = (step: number, title: string, explanation: string, status: number) => {
    add('rejected', step, title, explanation, {
      status,
      transfer: { from: 'gateway', to: 'client', label: `${status} · 网关拒绝`, tone: 'danger' },
    });
    add(
      'finished',
      7,
      '请求已结束',
      '没有调用上游，也没有产生模型用量。可点选历史步骤查看当时状态。',
    );
    return events;
  };
  add(
    'received',
    0,
    '请求抵达统一入口',
    '应用发送模型别名与网关令牌。它还不知道请求将交给哪一个上游。',
    {
      detail: requestBody,
      transfer: { from: 'client', to: 'gateway', label: 'POST · Chat Completions', tone: 'blue' },
    },
  );
  if (scenario === 'denied')
    return reject(
      1,
      '令牌验证失败',
      '本例令牌无效，网关返回 401；不会拿这把密钥去访问供应商。',
      401,
    );
  add(
    'access',
    1,
    '令牌与分组检查通过',
    '网关令牌有效，用户属于 learning 分组。上游服务凭据由网关另行管理。',
  );
  if (scenario === 'limited')
    return reject(
      2,
      '网关请求频率已达上限',
      '这是网关本地的 429，发生在渠道选择之前；并非上游返回的限流。',
      429,
    );
  add('rate', 2, '请求频率检查通过', '本例允许继续。接下来按分组、模型和可用状态筛选渠道。');
  if (scenario === 'forbidden')
    return reject(
      2,
      '没有模型访问权限',
      '令牌有效，但模型白名单不允许 demo-chat；分发阶段返回 403。',
      403,
    );
  if (scenario === 'unavailable')
    return reject(
      2,
      '没有合格的上游渠道',
      '当前没有渠道同时满足 learning 分组和 demo-chat 模型要求。',
      503,
    );
  const first =
    scenario === 'convert'
      ? conversionChannel
      : scenario === 'strict'
        ? channels[0]
        : selectChannel(channels, 1, random)!;
  const choose = (channel: Channel, retry = false) =>
    add(
      'selected',
      2,
      `${retry ? '改选备用' : '选中'}${channelNames[channel.id]} 渠道`,
      scenario === 'convert'
        ? '只有 Claude 渠道 满足本例条件；客户端仍然使用同一个模型别名。'
        : scenario === 'strict'
          ? '本例固定到 GPT 渠道，且只允许单次尝试。优先级与权重不参与此次选择。'
          : retry
            ? '进入较低优先级 5 的备用层，选择 Claude 渠道；不是在所有渠道中随意轮换。'
            : `先选优先级 10，再按 GPT:DeepSeek = 70:30 分配。本次教学随机值为 ${random.toFixed(2)}，选中 ${channelNames[channel.id]}。`,
      { channel },
    );
  choose(first);
  add(
    'validated',
    3,
    '请求参数校验通过',
    '模型、消息与输出上限合法。完整参数校验继续在控制器中进行。',
  );
  if (scenario === 'quota')
    return reject(
      3,
      '可用额度不足',
      '本例只有 50 额度，无法预扣 100。渠道虽已选中，但尚未发送上游请求。',
      403,
    );
  add(
    'reserved',
    3,
    '预留 100 额度',
    '可用额度暂时减少 100。这是预扣，不代表本次实际消耗了 100。',
    { detail: { initial: 1000, reserved: 100, available: 900, unit: '教学额度' } },
  );
  const send = (channel: Channel) => {
    add(
      'adapted',
      4,
      channel.protocol === 'Messages' ? '把 Chat 请求适配为 Messages' : '映射模型名，准备上游请求',
      channel.protocol === 'Messages'
        ? '保留问题内容，改用 Messages 端点和认证头。协议转换不保证所有字段与能力都等价。'
        : 'demo-chat 映射为渠道的模型名。出站使用上游凭据，不是客户端的网关令牌。',
      {
        channel,
        detail: {
          endpoint: channel.protocol === 'Messages' ? '/v1/messages' : '/v1/chat/completions',
          credential: '<upstream-demo-key>',
          body: upstreamBody(channel),
        },
      },
    );
    add(
      'started',
      4,
      `向${channelNames[channel.id]} 渠道 发起尝试`,
      '只有选中的上游收到请求。一次客户端请求可以包含多次尝试，但不是并行广播。',
      {
        channel,
        transfer: {
          from: 'gateway',
          to: `channel-${channel.id}`,
          label: '上游请求 · 独立凭据',
          tone: 'blue',
        },
      },
    );
  };
  send(first);
  const retrying = scenario === 'retry' || scenario === 'exhausted' || scenario === 'strict';
  let active = first;
  if (retrying) {
    add(
      'failed',
      4,
      `${channelNames[first.id]} 渠道 返回 503`,
      '上游尚未返回正文。本次尝试失败，网关开始判断是否允许重试。',
      {
        status: 503,
        channel: first,
        transfer: {
          from: `channel-${first.id}`,
          to: 'gateway',
          label: '503 · 上游错误',
          tone: 'danger',
        },
      },
    );
    if (scenario !== 'strict') {
      add(
        'retry',
        4,
        '策略允许再尝试一次',
        '503 命中本例重试规则，剩余 1 次。请求编号不变，预扣会话也不会重新创建。',
        { detail: { reason: 'retry_status_matched', remaining: 1 } },
      );
      active = selectChannel(channels, 2, random)!;
      choose(active, true);
      send(active);
    }
    if (scenario === 'exhausted' || scenario === 'strict') {
      if (scenario === 'exhausted')
        add('failed', 4, '备用渠道也返回 503', '两次尝试都在正文输出前失败；本例重试预算已用尽。', {
          channel: active,
          status: 503,
        });
      add(
        'rejected',
        4,
        scenario === 'strict' ? '固定渠道策略停止重试' : '重试次数已用尽',
        '请求以错误结束，不创建更多上游尝试。',
        {
          status: 503,
          transfer: { from: 'gateway', to: 'client', label: '503 · 最终失败', tone: 'danger' },
        },
      );
      add(
        'refunded',
        6,
        '释放预扣的 100 额度',
        '本例没有正文、可计费用量或额外费用，退还全部预扣。其他失败不一定免费。',
      );
      add(
        'finished',
        7,
        '失败报告已生成',
        '保留每次尝试与停止原因。回看记录不会重新发送，也不会重复退款。',
      );
      return events;
    }
  }
  const chunks = ['模型网关', '统一接入不同模型服务，', '并管理访问、路由和用量。'];
  for (const [i, text] of chunks.entries()) {
    add(
      'delta',
      5,
      i === 0 ? '收到第一段正文' : '正文继续增量到达',
      active.protocol === 'Messages'
        ? '上游 content_block_delta 转为 Chat delta，再交给应用。片段不等于单个 Token。'
        : '上游生成内容，网关转发给应用。动画片段不是网络包，也不代表单个 Token。',
      {
        text,
        channel: active,
        detail:
          active.protocol === 'Messages'
            ? {
                upstream: { type: 'content_block_delta', delta: { type: 'text_delta', text } },
                downstream: { choices: [{ delta: { content: text } }] },
              }
            : { choices: [{ delta: { content: text } }] },
        transfer: {
          from: `channel-${active.id}`,
          to: 'client',
          label: '正文增量 · 经网关返回',
          tone: 'green',
        },
      },
    );
    if (scenario === 'interrupted' && i === 1) {
      add(
        'interrupted',
        5,
        '流中断，保留已接收内容',
        '回答未完成，不拼接另一个模型续写。是否计费与回答状态分开，本例账务标记为待确认。',
        { transfer: { from: 'gateway', to: 'client', label: '流已中断', tone: 'danger' } },
      );
      add(
        'finished',
        7,
        '中断报告已生成',
        '这里没有模拟所有上游的中断结算策略，因此不宣称全额退款或正常结算。',
      );
      return events;
    }
  }
  add(
    'completed',
    5,
    '模型响应正常结束',
    '终止事件与正文片段不同。回答已完成，网关仍需处理本次用量与账务。',
  );
  add(
    'settled',
    6,
    '实际消耗 40，返还差额 60',
    '教学用量：输入 20 × 单价 1 + 输出 10 × 单价 2 = 40。预扣 100 只结算一次，余额为 960。',
    {
      detail: {
        input: 20,
        output: 10,
        inputPrice: 1,
        outputPrice: 2,
        actual: 40,
        returned: 60,
        available: 960,
        simulated: true,
      },
    },
  );
  add(
    'finished',
    7,
    '一次请求，完整闭环',
    '请求、渠道尝试、流状态和账单已关联。点击顶部已完成步骤，查看当时的数据与连接。',
  );
  return events;
}
export function upstreamBody(channel: Channel) {
  return {
    ...requestBody,
    model: channel.model,
    ...(channel.protocol === 'Messages' ? { stream_options: undefined } : {}),
  };
}
export type GatewayState = {
  access: boolean;
  rate: boolean;
  selected?: Channel;
  adapted: boolean;
  attempts: { channel: string; status: 'running' | 'failed' | 'completed' | 'interrupted' }[];
  answer: string;
  response: 'idle' | 'waiting' | 'streaming' | 'completed' | 'rejected' | 'interrupted';
  billing: 'none' | 'reserved' | 'settled' | 'refunded' | 'uncertain';
  initial: number;
  reserved: number;
  charged: number;
  returned: number;
  available: number;
  status?: number;
  last?: GatewayEvent;
};
export function replayGateway(
  events: GatewayEvent[],
  cursor: number,
  initial = 1000,
): GatewayState {
  const s: GatewayState = {
    access: false,
    rate: false,
    adapted: false,
    attempts: [],
    answer: '',
    response: 'idle',
    billing: 'none',
    initial,
    reserved: 0,
    charged: 0,
    returned: 0,
    available: initial,
  };
  const seen = new Set<string>();
  for (const e of events.slice(0, Math.max(0, cursor))) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    s.last = e;
    switch (e.kind) {
      case 'received':
        s.response = 'waiting';
        break;
      case 'access':
        s.access = true;
        break;
      case 'rate':
        s.rate = true;
        break;
      case 'selected':
        s.selected = e.channel;
        s.adapted = false;
        break;
      case 'reserved':
        if (s.billing === 'none') {
          s.billing = 'reserved';
          s.reserved = 100;
          s.available -= 100;
        }
        break;
      case 'adapted':
        s.adapted = true;
        break;
      case 'started':
        s.attempts.push({ channel: e.channel!.id, status: 'running' });
        break;
      case 'failed':
        if (s.attempts.at(-1)) s.attempts.at(-1)!.status = 'failed';
        break;
      case 'delta':
        s.response = 'streaming';
        s.answer += e.text;
        break;
      case 'completed':
        s.response = 'completed';
        if (s.attempts.at(-1)) s.attempts.at(-1)!.status = 'completed';
        break;
      case 'settled':
        if (s.billing === 'reserved') {
          s.billing = 'settled';
          s.reserved = 0;
          s.charged = 40;
          s.returned = 60;
          s.available = initial - 40;
        }
        break;
      case 'refunded':
        if (s.billing === 'reserved') {
          s.billing = 'refunded';
          s.returned = s.reserved;
          s.reserved = 0;
          s.available = initial;
        }
        break;
      case 'rejected':
        s.response = 'rejected';
        s.status = e.status;
        break;
      case 'interrupted':
        s.response = 'interrupted';
        s.billing = 'uncertain';
        if (s.attempts.at(-1)) s.attempts.at(-1)!.status = 'interrupted';
        break;
    }
  }
  return s;
}
