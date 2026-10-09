import { useEffect, useState } from 'react';
import { LayoutGroup, motion } from 'motion/react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import { Concept, definitions } from '../../components/Concept';
import { Token } from '../../components/Token';
import { candidatesFor, examples, scenes, type ExampleId } from '../../core/lesson';
import { defaults, distribution, randomAt, sample, type Parameters } from '../../core/sampling';
import { parseRoute, sceneHref } from '../../app/route';
import { ProbabilityChart } from './ProbabilityChart';
import { FilterBoundary } from './FilterBoundary';
import { ParameterPanel } from './ParameterPanel';
import { SamplingStrip } from './SamplingStrip';
import { useGeneration } from './useGeneration';

export function TokenDeck({ scene }: { scene: number }) {
  const [example, setExample] = useState<ExampleId>('sky');
  const [params, setParams] = useState<Parameters>(defaults);
  const [split, setSplit] = useState(true);
  const [compare, setCompare] = useState(false);
  const [comparisonRound, setComparisonRound] = useState(0);
  const effective = scene < 2 ? defaults : scene === 2 ? { ...params, topK: 0, topP: 1 } : params;
  const gen = useGeneration(example, effective, scene);
  const current = scenes[scene];
  const start = examples.find((e) => e.id === example)!;
  const layoutPrefix = `deck-${example}-${gen.words.length}`;
  useEffect(() => {
    setCompare(false);
    setComparisonRound(0);
    setSplit(true);
  }, [scene, example]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (event.target instanceof Element &&
          event.target.closest(
            'input,select,textarea,[contenteditable="true"],[role="slider"],[role="dialog"],[data-radix-popper-content-wrapper]',
          ))
      )
        return;
      if (document.querySelector('[role="dialog"]')) return;
      if (event.key === ' ' && event.target instanceof Element && event.target.closest('button,a'))
        return;
      const route = parseRoute(location.hash);
      if (route.page !== 'token') return;
      const position = route.scene;
      if (['ArrowRight', ' '].includes(event.key) && position < 5) {
        event.preventDefault();
        location.hash = sceneHref(position + 1);
      }
      if (event.key === 'ArrowLeft' && position > 0) {
        event.preventDefault();
        location.hash = sceneHref(position - 1);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
  const kept = gen.rows.filter((r) => r.probability > 0).length;
  return (
    <main className="deck-page" id="main-content">
      <div className="deck-heading">
        <div>
          <div className="eyebrow">
            {current.kicker}
            <span>交互讲解 · TOKEN</span>
          </div>
          <h1>{current.title}</h1>
          <p>{current.description}</p>
        </div>
        <div className="example-switch" aria-label="上下文示例">
          {examples.map((e) => (
            <button
              key={e.id}
              aria-pressed={example === e.id}
              onClick={() => {
                setExample(e.id);
                gen.setPlaying(false);
              }}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>
      <LayoutGroup id="token-deck">
        <div className={`lesson-layout ${scene >= 2 ? 'with-controls' : ''}`}>
          <section className={`stage scene-${scene + 1}`} aria-label={`${current.short}演示`}>
            <div className="stage-topline">
              <span className="stage-tag">
                <i /> 教学模拟
              </span>
              <span>
                按词简化展示{' '}
                <Concept title="Token" compact>
                  {definitions.Token}
                </Concept>
              </span>
            </div>
            <div className="context-label">
              <Concept title="上下文">{definitions.上下文}</Concept>
              <span>
                {gen.words.length ? `已生成 ${gen.words.length} 个片段` : '一切从这里开始'}
              </span>
            </div>
            <motion.div layout className="sentence" aria-label="当前上下文">
              {scene === 0 && !split ? (
                <motion.span className="unsplit-sentence">{start.tokens.join('')}</motion.span>
              ) : (
                start.tokens.map((word, i) => (
                  <Token key={`${example}-${i}`} word={word} id={`context-${example}-${i}`} />
                ))
              )}
              {gen.words.map((word, i) => (
                <Token key={`${i}-${word}`} word={word} fresh id={`deck-${example}-${i}-${word}`} />
              ))}
              {gen.ended ? (
                <span className="end-chip">
                  <Check size={16} /> 生成结束
                </span>
              ) : (
                <motion.span layout className="token empty-token">
                  {scene === 0 ? '?' : <span className="insertion-caret" />}
                </motion.span>
              )}
            </motion.div>
            {scene === 0 ? (
              <div className="intro-stage">
                <div className="token-bracket">
                  <span />
                  <span>
                    {split ? '不是一次写完整句，而是一次预测一个片段' : '先把文字分成可处理的片段'}
                  </span>
                  <span />
                </div>
                <div className="intro-model">
                  <span className="connector-line" />
                  <div className="model-orb">
                    <Sparkles size={30} />
                  </div>
                  <span className="connector-line" />
                </div>
                <div className="intro-explanation">
                  <span className="tiny-label">一段上下文</span>
                  <ArrowRight size={18} />
                  <strong>语言模型</strong>
                  <ArrowRight size={18} />
                  <span className="tiny-label">下一个 Token</span>
                </div>
                <button className="button secondary" onClick={() => setSplit((s) => !s)}>
                  <GitBranch size={16} />
                  {split ? '合回句子，再看一次' : '拆成词，看看里面'}
                </button>
                <p className="stage-footnote">词 → 数值表示 → 模型计算 → 下一词概率</p>
              </div>
            ) : (
              <>
                <div className="model-bridge">
                  <span />
                  <div>
                    <Sparkles size={14} /> 模型预测
                  </div>
                  <span />
                  <ArrowDown size={15} />
                </div>
                <ProbabilityChart
                  rows={gen.rows}
                  selected={gen.selected ?? undefined}
                  layoutPrefix={layoutPrefix}
                  baseline={scene >= 2}
                />
                {scene >= 4 && (
                  <SamplingStrip rows={gen.rows} random={gen.random} attempt={gen.attempt} />
                )}
                {scene >= 4 && (
                  <div className="generation-actions">
                    <button
                      className="button primary"
                      onClick={gen.draw}
                      disabled={gen.ended || gen.playing}
                    >
                      <Shuffle size={16} />
                      {gen.selected ? '再抽一次' : '抽取下一个词'}
                    </button>
                    {scene === 5 && (
                      <button
                        className="button secondary"
                        onClick={gen.append}
                        disabled={!gen.selected || gen.playing || gen.ended}
                      >
                        <ArrowRight size={16} />
                        {gen.selected === '<结束>' ? '确认结束' : '接到句尾'}
                      </button>
                    )}
                    {scene === 5 && (
                      <button
                        className="icon-button play-button"
                        aria-label={gen.playing ? '暂停连续生成' : '播放连续生成'}
                        disabled={gen.ended}
                        onClick={() => gen.setPlaying(!gen.playing)}
                      >
                        {gen.playing ? <Pause size={18} /> : <Play size={18} />}
                      </button>
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
                )}
                {scene === 3 && <FilterBoundary rows={gen.rows} topP={params.topP} />}
                {scene === 3 && (
                  <div className="filter-result">
                    <span className="status-dot" />
                    {kept} / {gen.rows.length} 个候选保留
                    <span>排除的词不参与抽样；剩余概率重新归一化为 100%。</span>
                  </div>
                )}
              </>
            )}
          </section>
          {scene >= 2 && (
            <div className="side-stack">
              <ParameterPanel
                params={params}
                onChange={setParams}
                filters={scene >= 3}
                disabled={gen.playing}
              />
              <div className="observation">
                <div>
                  <Lightbulb size={17} />
                  <span>观察一下</span>
                </div>
                <p>
                  {scene === 2
                    ? `当前最高概率为 ${(gen.rows[0].probability * 100).toFixed(1)}%。${params.temperature < 1 ? '分布比原始状态更集中。' : params.temperature > 1 ? '更多候选获得了机会。' : '温度为 1，保持原始分布。'}`
                    : `现在有 ${kept} 个词可以被选中。${kept === 1 ? '只剩一个候选，再抽样也会得到相同结果。' : '调整参数后，观察概率和最终选词如何变化。'}`}
                </p>
              </div>
              {scene === 5 && (
                <button
                  className={`compare-toggle ${compare ? 'active' : ''}`}
                  onClick={() => {
                    setCompare(!compare);
                    gen.setPlaying(false);
                  }}
                  aria-expanded={compare}
                >
                  <GitBranch size={17} />
                  {compare ? '收起参数对比' : '同一随机数，比较两组参数'}
                  <ArrowRight size={15} />
                </button>
              )}
            </div>
          )}
        </div>
      </LayoutGroup>
      {scene === 5 && compare && (
        <section className="comparison" aria-label="参数对比">
          <div className="comparison-heading">
            <div>
              <strong>只改变参数，会发生什么？</strong>
              <p>固定本轮上下文和随机数，只比较参数对候选与选词的影响；两组结果也可能相同。</p>
            </div>
            <button className="button secondary" onClick={() => setComparisonRound((r) => r + 1)}>
              换一个随机数
            </button>
          </div>
          <div className="comparison-grid">
            {[
              { title: '默认参数', parameters: defaults },
              { title: '当前参数', parameters: effective },
            ].map(({ title, parameters }) => {
              const rows = distribution(candidatesFor(example, gen.words), parameters);
              const r = randomAt(73, comparisonRound);
              const chosen = sample(rows, r);
              return (
                <div key={title}>
                  <span className="tiny-label">
                    {title} · 随机数 {r.toFixed(3)}
                  </span>
                  <strong>{chosen.word === '<结束>' ? '结束标记' : chosen.word}</strong>
                  <span>
                    被抽中概率 {(chosen.probability * 100).toFixed(1)}% ·{' '}
                    {rows.filter((row) => row.probability > 0).length} 个候选
                  </span>
                  <small>
                    T {parameters.temperature.toFixed(1)} / K {parameters.topK || '不限'} / P{' '}
                    {parameters.topP.toFixed(2)}
                  </small>
                </div>
              );
            })}
          </div>
        </section>
      )}
      <div className="lesson-note">
        <span>记住这一点</span>
        <p>{current.insight}</p>
      </div>
      <footer className="deck-navigation">
        <a className="button text-button" href={scene === 0 ? '#/' : sceneHref(scene - 1)}>
          <ChevronLeft size={17} />
          {scene === 0 ? '首页' : '上一幕'}
        </a>
        <div className="scene-progress" aria-label="演示进度">
          {scenes.map((s, i) => (
            <a
              key={s.short}
              href={sceneHref(i)}
              aria-label={`第 ${i + 1} 幕：${s.short}`}
              aria-current={i === scene ? 'step' : undefined}
              className={i <= scene ? 'visited' : ''}
            >
              <span />
            </a>
          ))}
          <span>{String(scene + 1).padStart(2, '0')} / 06</span>
        </div>
        <div className="nav-end">
          <button
            className="icon-button"
            onClick={() => {
              gen.reset();
              setSplit(true);
              setComparisonRound(0);
            }}
            aria-label="重播当前幕"
          >
            <RotateCcw size={16} />
          </button>
          <a className="button nav-next" href={scene < 5 ? sceneHref(scene + 1) : '#/'}>
            {scene < 5 ? '下一幕' : '回到首页'}
            {scene < 5 ? <ChevronRight size={17} /> : <ArrowLeft size={17} />}
          </a>
        </div>
      </footer>
      <p className="keyboard-hint">
        ← → 切换场景 <span>·</span> 悬停或点按概念，了解更多 <span>·</span> 所有概率均为教学模拟
      </p>
    </main>
  );
}
