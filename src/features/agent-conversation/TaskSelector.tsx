import { useLayoutEffect, useRef, useState } from 'react';
import type { Task } from '../../core/agent-conversation/fixtures';
import { useCalmMotion } from '../../components/MotionPreference';

const tasks: { value: Task; label: string; description: string }[] = [
  { value: 'summary', label: '读取并总结', description: '读取文件 · 生成摘要' },
  { value: 'save-summary', label: '整理并保存', description: '列出目录 · 读取 · 写入' },
];

export function TaskSelector({
  task,
  onTask,
  disabled,
}: {
  task: Task;
  onTask: (task: Task) => void;
  disabled: boolean;
}) {
  const reduced = useCalmMotion();
  const [keyboard, setKeyboard] = useState(false);
  const tabs = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const viewport = tabs.current;
    const selected = viewport?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!viewport || !selected) return;
    const reveal = () => {
      const strip = viewport.getBoundingClientRect();
      const item = selected.getBoundingClientRect();
      if (item.right > strip.right) viewport.scrollLeft += item.right - strip.right;
      else if (item.left < strip.left) viewport.scrollLeft += item.left - strip.left;
    };
    const observer = new ResizeObserver(reveal);
    observer.observe(viewport);
    observer.observe(selected);
    reveal();
    return () => observer.disconnect();
  }, [task]);
  return (
    <div className="agent-task-picker">
      <span className="workbench-simulation">
        <i /> 教学模拟
      </span>
      <div
        className="agent-task-tabs"
        role="tablist"
        aria-label="选择预设任务"
        data-static={reduced || keyboard}
        ref={tabs}
      >
        <div className="agent-task-options">
          <span
            className="agent-task-indicator"
            aria-hidden="true"
            style={{
              transform: `translateX(${tasks.findIndex((item) => item.value === task) * 100}%)`,
            }}
          />
          {tasks.map((item, index) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              id={`agent-task-${item.value}`}
              aria-controls="agent-task-panel"
              aria-selected={task === item.value}
              aria-label={item.label}
              aria-describedby={`agent-task-description-${item.value}`}
              title={item.description}
              tabIndex={task === item.value ? 0 : -1}
              disabled={disabled}
              onPointerDown={() => setKeyboard(false)}
              onClick={() => onTask(item.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') setKeyboard(true);
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? tasks.length - 1
                      : event.key === 'ArrowRight'
                        ? (index + 1) % tasks.length
                        : event.key === 'ArrowLeft'
                          ? (index + tasks.length - 1) % tasks.length
                          : undefined;
                if (next === undefined || disabled) return;
                event.preventDefault();
                setKeyboard(true);
                onTask(tasks[next].value);
                event.currentTarget.parentElement
                  ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                  [next]?.focus();
              }}
            >
              <strong>{item.label}</strong>
              <span id={`agent-task-description-${item.value}`} className="sr-only">
                {item.description}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
