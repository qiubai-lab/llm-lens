import { Fragment } from 'react';

export function RawData({ value }: { value: unknown }) {
  return (
    <pre className="agent-code">
      {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
    </pre>
  );
}

// Color only the serialized tokens; never reinterpret nested argument/output strings.
export function JsonData({ value }: { value: unknown }) {
  const text = JSON.stringify(value, null, 2) ?? 'null';
  const lines = text.split('\n');
  return (
    <pre className="activity-json" aria-label="格式化 JSON">
      <code>
        {lines.map((line, i) => (
          <span className="json-line" data-line={i + 1} key={i}>
            <JsonLine text={line} />
            {i < lines.length - 1 ? '\n' : ''}
          </span>
        ))}
      </code>
    </pre>
  );
}

function JsonLine({ text }: { text: string }) {
  const pattern =
    /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}\[\],:])/g;
  const pieces = [];
  let start = 0;
  for (const match of text.matchAll(pattern)) {
    const kind = match[1]
      ? match[2]
        ? 'key'
        : 'string'
      : match[3]
        ? 'number'
        : match[4]
          ? 'literal'
          : 'punctuation';
    pieces.push(
      <Fragment key={match.index}>
        {text.slice(start, match.index)}
        <span className={`json-${kind}`}>{match[0]}</span>
      </Fragment>,
    );
    start = match.index + match[0].length;
  }
  return (
    <>
      {pieces}
      {text.slice(start)}
    </>
  );
}
