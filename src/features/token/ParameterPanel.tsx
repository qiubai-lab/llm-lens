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
  const slider = (
    key: keyof Parameters,
    name: keyof typeof definitions,
    min: number,
    max: number,
    step: number,
    text: string,
    ends: string[],
  ) => (
    <div className="parameter" key={key}>
      <div className="parameter-heading">
        <Concept title={name}>{definitions[name]}</Concept>
        <output>{text}</output>
      </div>
      <Slider.Root
        className="slider"
        aria-label={name}
        min={min}
        max={max}
        step={step}
        value={[params[key]]}
        disabled={disabled}
        onValueChange={(value) => onChange({ ...params, [key]: value[0] })}
      >
        <Slider.Track className="slider-track">
          <Slider.Range className="slider-range" />
        </Slider.Track>
        <Slider.Thumb className="slider-thumb" aria-label={name} />
      </Slider.Root>
      <div className="slider-ends">
        <span>{ends[0]}</span>
        <span>{ends[1]}</span>
      </div>
    </div>
  );
  return (
    <aside className="parameter-panel">
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
          <RotateCcw size={15} />
        </button>
      </div>
      {slider('temperature', 'Temperature', 0.2, 2, 0.1, params.temperature.toFixed(1), [
        '更集中',
        '更平缓',
      ])}
      {filters && (
        <>
          {slider('topK', 'Top-k', 0, 6, 1, params.topK === 0 ? '不限制' : `${params.topK}`, [
            '不限制',
            '6 个候选',
          ])}
          {slider('topP', 'Top-p', 0.1, 1, 0.05, params.topP.toFixed(2), [
            '更小的候选池',
            '全部保留',
          ])}
        </>
      )}
      <p className="panel-note">
        {filters
          ? '顺序：温度 → Top-k → Top-p → 归一化。实际 API 的处理顺序可能不同。'
          : '试试 0.3 和 1.8，观察高概率词与低概率词的机会如何变化。'}
      </p>
    </aside>
  );
}
