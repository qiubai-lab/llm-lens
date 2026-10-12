export function RawData({ value }: { value: unknown }) {
  return (
    <pre className="agent-code">
      {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
    </pre>
  );
}
