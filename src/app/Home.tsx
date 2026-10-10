import { useState } from 'react';
import { LayoutGroup, motion } from 'motion/react';
import { ArrowDown, ArrowRight, ArrowUpRight, CirclePlay, RotateCcw, Sparkles } from 'lucide-react';
import { Token } from '../components/Token';
import { Concept, definitions } from '../components/Concept';
import { candidatesFor, topic } from '../core/lesson';
import { defaults, distribution, randomAt, sample } from '../core/sampling';

export function Home({ onAbout }: { onAbout: (trigger: HTMLElement) => void }) {
  const [word, setWord] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const rows = distribution(candidatesFor('sky', []), defaults);
  return (
    <main className="home-page" id="main-content">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" /> 给好奇心，一个看得见的答案
          </div>
          <h1>
            从一个词，
            <br />
            看懂
            <span className="hero-accent">
              语言模型
              <svg viewBox="0 0 350 16" aria-hidden="true">
                <path d="M5 11 Q165 -3 345 9" />
              </svg>
            </span>
            。
          </h1>
          <p className="hero-description">
            不从公式开始。
            <br />
            拨动参数，看见概率，亲手生成下一个词。
            <br />
            用一点点交互，理解 LLM 背后的原理。
          </p>
          <div className="hero-actions">
            <a className="button primary large" href="#/token/1">
              开始探索 <ArrowUpRight size={19} />
            </a>
            <button
              className="button text-button"
              onClick={(event) => onAbout(event.currentTarget)}
            >
              <CirclePlay size={18} /> 这是怎样的项目？
            </button>
          </div>
          <div className="hero-meta">
            <span>
              <i /> 无需 AI 基础
            </span>
            <span>{topic.duration}</span>
            <span>免费 · 无需密钥</span>
          </div>
        </div>
        <LayoutGroup id="home-preview">
          <div className="hero-visual">
            <div className="preview-header">
              <span>
                <span className="status-dot" /> 一个词的诞生
              </span>
              <span className="tiny-label">
                LIVE DEMO{' '}
                <Concept title="教学模拟" compact>
                  这个小实验使用预设候选和真实的抽样计算，不会请求模型 API。
                </Concept>
              </span>
            </div>
            <div className="preview-body">
              <div className="preview-context-label">给模型的上文</div>
              <div className="preview-sentence">
                {['今天', '的', '天空', '很'].map((text, i) => (
                  <Token word={text} key={i} />
                ))}
                {word ? (
                  <Token word={word} fresh id={`preview-${word}`} />
                ) : (
                  <span className="token empty-token">?</span>
                )}
              </div>
              <div className="preview-model">
                <div className="preview-flow" />
                <span>
                  <Sparkles size={17} /> 预测下一个词
                </span>
                <div className="preview-flow" />
                <ArrowDown size={16} />
              </div>
              <div className="preview-candidates">
                {rows.slice(0, 3).map((row) => (
                  <div
                    className={`preview-candidate ${word === row.word ? 'selected' : ''}`}
                    key={row.word}
                  >
                    {word === row.word ? (
                      <span className="preview-word">{row.word}</span>
                    ) : (
                      <motion.span layoutId={`preview-${row.word}`} className="preview-word">
                        {row.word}
                      </motion.span>
                    )}
                    <span className="preview-bar">
                      <span style={{ width: `${row.probability * 180}%` }} />
                    </span>
                    <span>
                      {Math.round(row.probability * 100)}
                      <small>%</small>
                    </span>
                  </div>
                ))}
                <div className="preview-others">
                  <span>其他候选</span>
                  <span>20%</span>
                </div>
              </div>
              <div className="preview-bottom">
                <p className="preview-status" role="status">
                  <span className="preview-status-reserve" aria-hidden="true">
                    下一个词，还没有确定。
                    <br />
                    概率越大，被选中的机会越大。
                  </span>
                  <span className="preview-status-reserve" aria-hidden="true">
                    这次是「湛蓝」。
                    <br />
                    它将成为下一次预测的上下文。
                  </span>
                  <span>
                    {word ? (
                      <>
                        这次是「<strong>{word}</strong>」。
                        <br />
                        它将成为下一次预测的上下文。
                      </>
                    ) : (
                      <>
                        下一个词，还没有确定。
                        <br />
                        概率越大，被选中的机会越大。
                      </>
                    )}
                  </span>
                </p>
                <button
                  className="button preview-generate"
                  onClick={() => {
                    if (word) setWord(null);
                    else {
                      setWord(sample(rows, randomAt(2026, attempt)).word);
                      setAttempt((a) => a + 1);
                    }
                  }}
                >
                  {word ? (
                    <>
                      <RotateCcw size={15} /> 再试一次
                    </>
                  ) : (
                    <>
                      生成一个词 <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="preview-footer">
              <span>CONTEXT</span>
              <span>→</span>
              <span>PROBABILITY</span>
              <span>→</span>
              <span className={word ? 'active' : ''}>NEXT TOKEN</span>
            </div>
          </div>
        </LayoutGroup>
      </section>
      <section className="exploration-path" aria-label="本次探索路线">
        <div className="path-heading">
          <span className="tiny-label">THE FIRST EXPLORATION</span>
          <h2>一个词，是怎样生成的？</h2>
          <p>一次完整的生成过程，拆成六个看得懂的瞬间。</p>
        </div>
        <div className="path-items">
          {[
            { n: '01—02', title: '看见预测', text: '从文字，到下一词的概率', scene: 1 },
            { n: '03—04', title: '改变可能', text: '温度与候选筛选，亲手调节', scene: 3 },
            { n: '05—06', title: '让语言生长', text: '抽样、追加，再预测一次', scene: 5 },
          ].map((item) => (
            <a href={`#/token/${item.scene}`} key={item.n}>
              <span>{item.n}</span>
              <strong>
                {item.title}
                <ArrowUpRight size={17} />
              </strong>
              <p>{item.text}</p>
            </a>
          ))}
        </div>
      </section>
      <footer className="home-footer">
        <span>
          LLM Lens <i> / </i> 把抽象的原理，变成直觉。
        </span>
        <span>
          按词简化展示{' '}
          <Concept title="Token" compact>
            {definitions.Token}
          </Concept>
          <span className="footer-dot">·</span> 教学模拟
        </span>
      </footer>
    </main>
  );
}
