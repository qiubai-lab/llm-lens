import { useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Concept, definitions } from '../../components/Concept';
import { defaults, type Parameters } from '../../core/sampling';

export function ParameterPanel({
  params,
  onChange,
  filters,
  disabled = false,
}: {
  params: Parameters;
  onChange: (p: Parameters) => void;
  filters: boolean;
  disabled?: boolean;
}) {
  const [active, setActive] = useState<keyof Parameters>('temperature');
  const controls: {
    key: keyof Parameters;
    name: 'Temperature' | 'Top-k' | 'Top-p';
    min: number;
    max: number;
    step: number;
    value: string;
    ends: string[];
  }[] = [
    {
      key: 'temperature',
      name: 'Temperature',
      min: 0.2,
      max: 2,
      step: 0.1,
      value: params.temperature.toFixed(1),
      ends: ['更集中', '更平缓'],
    },
    ...(filters
      ? [
          {
            key: 'topK' as const,
            name: 'Top-k' as const,
            min: 0,
            max: 6,
            step: 1,
            value: params.topK === 0 ? '不限' : `${params.topK}`,
            ends: ['不限制', '6 个候选'],
          },
          {
            key: 'topP' as const,
            name: 'Top-p' as const,
            min: 0.1,
            max: 1,
            step: 0.05,
            value: params.topP.toFixed(2),
            ends: ['更小的候选池', '全部保留'],
          },
        ]
      : []),
  ];
  const current = filters ? active : 'temperature';
  return (
    <aside className="parameter-panel" aria-label="生成参数">
      <div className="panel-heading">
        <span>
          <SlidersHorizontal size={16} /> 调节生成方式
        </span>
        <button
          className="icon-button"
          onClick={() => onChange(defaults)}
          disabled={disabled}
          aria-label="恢复默认参数"
        >
          <RotateCcw size={16} />
        </button>
      </div>
      {filters && (
        <div className="parameter-tabs" role="group" aria-label="选择调节参数">
          {controls.map((control) => (
            <button
              key={control.key}
              aria-pressed={current === control.key}
              onClick={() => setActive(control.key)}
            >
              <span>{control.name === 'Temperature' ? '温度' : control.name}</span>
              <strong>{control.value}</strong>
            </button>
          ))}
        </div>
      )}
      {controls.map((control) => (
        <div
          className={`parameter ${current === control.key ? 'parameter-active' : ''}`}
          key={control.key}
        >
          <div className="parameter-heading">
            <Concept title={control.name}>{definitions[control.name]}</Concept>
            <output>{control.value}</output>
          </div>
          <Slider.Root
            className="slider"
            aria-label={control.name}
            min={control.min}
            max={control.max}
            step={control.step}
            value={[params[control.key]]}
            disabled={disabled}
            onValueChange={(value) => onChange({ ...params, [control.key]: value[0] })}
          >
            <Slider.Track className="slider-track">
              <Slider.Range className="slider-range" />
            </Slider.Track>
            <Slider.Thumb className="slider-thumb" aria-label={control.name} />
          </Slider.Root>
          <div className="slider-ends">
            <span>{control.ends[0]}</span>
            <span>{control.ends[1]}</span>
          </div>
        </div>
      ))}
      <p className="panel-note">
        {filters
          ? '温度 → Top-k → Top-p → 归一化。实际 API 的处理顺序可能不同。'
          : '试试 0.3 和 1.8，观察候选的机会如何变化。'}
      </p>
    </aside>
  );
}
