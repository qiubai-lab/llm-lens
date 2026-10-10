import { ArrowRight, Pause, Play, Shuffle } from 'lucide-react';
import type { useGeneration } from './useGeneration';

export function GenerationControls({
  generation: gen,
  scene,
}: {
  generation: ReturnType<typeof useGeneration>;
  scene: number;
}) {
  return (
    <div className="generation-actions">
      <button className="button primary" onClick={gen.draw} disabled={gen.ended || gen.playing}>
        <Shuffle size={16} />
        {gen.selected ? '再抽一次' : '抽取下一个词'}
      </button>
      {scene === 5 && (
        <>
          <button
            className="button secondary"
            onClick={gen.append}
            disabled={!gen.selected || gen.playing || gen.ended}
          >
            <ArrowRight size={16} />
            {gen.selected === '<结束>' ? '确认结束' : '接到句尾'}
          </button>
          <button
            className="icon-button play-button"
            aria-label={gen.playing ? '暂停连续生成' : '播放连续生成'}
            disabled={gen.ended}
            onClick={() => gen.setPlaying(!gen.playing)}
          >
            {gen.playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
        </>
      )}
      <span className="generation-status" role="status">
        {gen.ended
          ? '遇到结束标记，本轮已完成。'
          : gen.selected
            ? `本次选中「${gen.selected === '<结束>' ? '结束标记' : gen.selected}」${scene === 5 ? '，等待接回上下文' : ''}`
            : scene === 5
              ? '先抽取，再追加；也可以播放完整过程'
              : '保持上下文不变，试试重复抽样'}
      </span>
    </div>
  );
}
