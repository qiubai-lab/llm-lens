import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowUpRight, Check, Copy, X } from 'lucide-react';
import { useCalmMotion } from '../../components/MotionPreference';
import { highlightedKeys, protocols, sources } from '../../core/protocols/lesson';
import {
  documents,
  focusItems,
  jsonLines,
  pathLabel,
  pointer,
  withinPath,
  type Direction,
  type JsonPath,
} from '../../core/protocols/documents';
import '../../styles/protocols.css';

// Render JSON as React text nodes, never interpolated HTML.
function colorLine(line: string) {
  const parts: ReactNode[] = [];
  const tokens = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null|\d+)\b/g;
  let from = 0;
  for (const match of line.matchAll(tokens)) {
    const index = match.index!;
    parts.push(line.slice(from, index));
    parts.push(
      <span
        key={index}
        className={match[2] ? 'json-key' : match[3] ? 'json-literal' : 'json-string'}
      >
        {match[0]}
      </span>,
    );
    from = index + match[0].length;
  }
  parts.push(line.slice(from));
  return parts;
}
function JsonBlock({
  data,
  target,
  revision,
  label,
}: {
  data: unknown;
  target: JsonPath;
  revision: number;
  label: string;
}) {
  const lines = useMemo(() => jsonLines(data), [data]);
  const scroller = useRef<HTMLPreElement>(null);
  const calm = useCalmMotion();
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const line = [...box.querySelectorAll<HTMLElement>('[data-path]')].find(
      (el) => el.dataset.path === pointer(target),
    );
    const top =
      target.length && line
        ? line.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 14
        : 0;
    box.scrollTo({
      top: Math.max(0, top),
      behavior: calm || !target.length ? 'instant' : 'smooth',
    });
  }, [target, revision, calm, data]);
  return (
    <pre
      className="protocol-json"
      ref={scroller}
      tabIndex={0}
      aria-label={`${label} 完整 JSON，可滚动`}
    >
      <code>
        {lines.map((line, index) => {
          const key = /^\s*"([^"\\]+)"\s*:/.exec(line.text)?.[1];
          return (
            <span
              className="json-line"
              data-path={pointer(line.path)}
              data-selected={withinPath(line.path, target)}
              data-highlight={!!key && highlightedKeys.has(key)}
              key={index}
            >
              <span className="json-number" aria-hidden="true">
                {index + 1}
              </span>
              <span className="json-code">
                {colorLine(line.text)}
                {'\n'}
              </span>
            </span>
          );
        })}
      </code>
    </pre>
  );
}
function CopyJson({ data, label }: { data: unknown; label: string }) {
  const [status, setStatus] = useState('');
  useEffect(() => setStatus(''), [data]);
  return (
    <button
      className="protocol-copy"
      aria-label={`复制 ${label} 完整 JSON`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
          setStatus('已复制');
        } catch {
          setStatus('复制失败，请手动选择');
        }
      }}
    >
      {status === '已复制' ? <Check size={14} /> : <Copy size={14} />}
      <span role="status">{status || '复制 JSON'}</span>
    </button>
  );
}
const rootPath: JsonPath = [];
export function ProtocolDeck({ suspended }: { suspended: boolean }) {
  const [direction, setDirection] = useState<Direction>('request');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const focus = focusItems[direction].find((item) => item.id === focusId);
  function select(id: string | null) {
    setFocusId(id);
    setRevision((n) => n + 1);
  }
  return (
    <main className="protocol-page" id="main-content">
      <header className="protocol-heading">
        <span className="eyebrow">THREE PROTOCOLS, SIDE BY SIDE</span>
        <div className="protocol-title-row">
          <h1>请求与响应，完整 JSON 对照。</h1>
          <div className="protocol-mode-cards" role="group" aria-label="请求与响应演示">
            {(['request', 'response'] as const).map((value) => (
              <button
                key={value}
                disabled={suspended}
                aria-pressed={direction === value}
                onClick={() => {
                  setDirection(value);
                  select(null);
                }}
              >
                {value === 'request' ? '请求' : '响应'}
              </button>
            ))}
          </div>
          <Dialog.Root>
            <Dialog.Trigger className="protocol-source-tag" disabled={suspended}>
              样例与官方依据
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="modal-overlay" />
              <Dialog.Content className="protocol-source-dialog">
                <header>
                  <Dialog.Title>样例与官方依据</Dialog.Title>
                  <Dialog.Close className="icon-button" aria-label="关闭样例与官方依据">
                    <X size={18} />
                  </Dialog.Close>
                </header>
                <Dialog.Description>教学样例 · 非流式 · 无真实请求</Dialog.Description>
                <div className="protocol-sources">
                  <p>
                    展示本场景的完整请求体与响应对象，不用省略号替代内容；不代表所有可选参数的全集。模型、ID、时间、天气和用量均为教学值。使用真实
                    API 时需替换模型，并提供对应认证。Responses 本例显式携带 input 历史，未使用
                    previous_response_id。
                  </p>
                  <p>
                    三种响应都包含待执行的杭州工具调用。Responses 的 completed
                    表示生成完成；正文通过 output 内容条目返回，SDK 的 output_text
                    是便利属性。核对日期：2026-10-21。
                  </p>
                  <div>
                    {sources.map(([name, url]) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer">
                        {name}
                        <ArrowUpRight size={13} />
                      </a>
                    ))}
                  </div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </header>
      <nav className="protocol-navigation" aria-label="定位 JSON 字段">
        <button disabled={suspended} aria-pressed={!focus} onClick={() => select(null)}>
          <span>00</span>全部 JSON
        </button>
        {focusItems[direction].map((item, index) => (
          <button
            key={item.id}
            disabled={suspended}
            aria-pressed={focusId === item.id}
            onClick={() => select(item.id)}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            {item.title}
          </button>
        ))}
      </nav>
      <div className="protocol-lanes">
        {protocols.map((p) => {
          const data = documents[direction][p.id],
            target = focus?.paths[p.id] ?? rootPath;
          const label = `${p.vendor} ${p.name}`;
          return (
            <article className="protocol-lane" key={p.id} aria-label={label}>
              <header>
                <span className="tiny-label">{p.vendor}</span>
                <h2>{p.name}</h2>
                <code>
                  {direction === 'request' ? 'POST' : '200 OK'} {p.endpoint}
                </code>
              </header>
              <div className="protocol-location">
                <span>{focus ? '定位字段' : '完整对象'}</span>
                <code>{target.length ? pathLabel(target) : '$'}</code>
              </div>
              <JsonBlock data={data} target={target} revision={revision} label={label} />
              <div className="protocol-code-footer">
                <span>{jsonLines(data).length} 行 · 全文保留</span>
                <CopyJson data={data} label={label} />
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
