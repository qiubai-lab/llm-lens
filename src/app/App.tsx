import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tooltip from '@radix-ui/react-tooltip';
import { MotionConfig } from 'motion/react';
import {
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Command,
  Layers,
  List,
  Scan,
  X,
  Zap,
  ZapOff,
} from 'lucide-react';
import { ReducedMotionContext, useSystemReducedMotion } from '../components/MotionPreference';
import { Home } from './Home';
import { parseRoute, sceneHref } from './route';
import { topic } from '../core/lesson';
import { TokenDeck } from '../features/token/TokenDeck';

export function App() {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  const [about, setAbout] = useState(false);
  const aboutTrigger = useRef<HTMLElement | null>(null);
  const openAbout = (trigger: HTMLElement) => {
    aboutTrigger.current = trigger;
    setAbout(true);
  };
  const [directory, setDirectory] = useState(false);
  const preferredReduced = useSystemReducedMotion();
  const [reduced, setReduced] = useState(false);
  const reduceMotion = Boolean(preferredReduced || reduced);
  useEffect(() => {
    const change = () => {
      setRoute(parseRoute(location.hash));
      setDirectory(false);
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reduceMotion);
  }, [reduceMotion]);
  useEffect(() => {
    document.title = `${route.page === 'home' ? '看见语言模型如何生成' : topic.scenes[route.scene].short} · LLM Lens`;
  }, [route]);
  return (
    <ReducedMotionContext.Provider value={reduceMotion}>
      <MotionConfig
        reducedMotion={reduceMotion ? 'always' : 'never'}
        transition={{ duration: reduceMotion ? 0 : 0.35 }}
      >
        <Tooltip.Provider delayDuration={180} skipDelayDuration={100}>
          <a
            className="skip-link"
            href="#main-content"
            onClick={(e) => {
              e.preventDefault();
              const main = document.querySelector('main');
              main?.setAttribute('tabindex', '-1');
              main?.focus();
            }}
          >
            跳至主要内容
          </a>
          <header className="site-header">
            <a className="brand" href="#/" aria-label="LLM Lens 首页">
              <span className="brand-mark">
                <Scan size={23} strokeWidth={2} />
              </span>
              <span>
                LLM <b>Lens</b>
                <small>看见，才能理解。</small>
              </span>
            </a>
            <nav aria-label="主导航">
              <a className={route.page === 'home' ? 'active' : ''} href="#/">
                探索
              </a>
              <button onClick={(event) => openAbout(event.currentTarget)}>关于项目</button>
            </nav>
            <div className="header-end">
              <span className="edition">一份可交互的 LLM 入门指南</span>
              <button
                className="icon-button motion-preference"
                aria-label={reduceMotion ? '动态效果已减少' : '减少动态效果'}
                aria-pressed={reduceMotion}
                disabled={Boolean(preferredReduced)}
                title={preferredReduced ? '已遵循系统减少动态效果设置' : '切换动态效果'}
                onClick={() => setReduced(!reduced)}
              >
                {reduceMotion ? <ZapOff size={17} /> : <Zap size={17} />}
              </button>
            </div>
          </header>
          {route.page === 'home' ? <Home onAbout={openAbout} /> : <TokenDeck scene={route.scene} />}
          <Dialog.Root open={directory} onOpenChange={setDirectory}>
            <Dialog.Trigger asChild>
              <button className="directory-trigger">
                <List size={18} />
                <span>探索目录</span>
                {route.page === 'token' && (
                  <span className="directory-count">{route.scene + 1}/6</span>
                )}
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="modal-overlay directory-overlay" />
              <Dialog.Content className="directory-panel" aria-describedby="directory-description">
                <div className="dialog-top">
                  <span className="tiny-label">YOUR EXPLORATION</span>
                  <Dialog.Close className="icon-button" aria-label="关闭目录">
                    <X size={20} />
                  </Dialog.Close>
                </div>
                <Dialog.Title>探索目录</Dialog.Title>
                <Dialog.Description id="directory-description">
                  按顺序看，也可以从好奇的地方开始。
                </Dialog.Description>
                <a className="directory-home" href="#/" onClick={() => setDirectory(false)}>
                  <Layers size={17} /> 返回首页 <ArrowUpRight size={16} />
                </a>
                <div className="directory-topic">
                  <BookOpen size={18} />
                  <div>
                    <strong>{topic.title}</strong>
                    <span>
                      {topic.subtitle} · {topic.duration}
                    </span>
                  </div>
                </div>
                <div className="directory-scenes">
                  {topic.scenes.map((s, i) => (
                    <a
                      href={sceneHref(i)}
                      onClick={() => setDirectory(false)}
                      key={s.short}
                      aria-current={
                        route.page === 'token' && route.scene === i ? 'page' : undefined
                      }
                    >
                      <span>{String(i + 1).padStart(2, '0')}</span>
                      <strong>{s.short}</strong>
                      <ChevronRight size={16} />
                    </a>
                  ))}
                </div>
                <p className="directory-tip">
                  <Command size={14} /> 演示中可使用 ← → 切换场景
                </p>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <Dialog.Root open={about} onOpenChange={setAbout}>
            <Dialog.Portal>
              <Dialog.Overlay className="modal-overlay" />
              <Dialog.Content
                className="about-dialog"
                onCloseAutoFocus={(e) => {
                  e.preventDefault();
                  aboutTrigger.current?.focus();
                }}
              >
                <div className="dialog-top">
                  <span className="brand-mark">
                    <Scan size={24} />
                  </span>
                  <Dialog.Close className="icon-button" aria-label="关闭项目说明">
                    <X size={20} />
                  </Dialog.Close>
                </div>
                <span className="eyebrow">ABOUT LLM LENS</span>
                <Dialog.Title>
                  把抽象的原理，
                  <br />
                  变成直觉。
                </Dialog.Title>
                <Dialog.Description>
                  一个面向普通用户与开发者的交互科普项目。无需先懂公式，用动画和小实验，逐步理解大语言模型。
                </Dialog.Description>
                <div className="about-sections">
                  <div>
                    <span>01</span>
                    <p>
                      <strong>用操作建立理解</strong>
                      调节参数、观察分布、重复抽样。每次变化，都对应一个具体的原理。
                    </p>
                  </div>
                  <div>
                    <span>02</span>
                    <p>
                      <strong>先建立直觉，再逐步深入</strong>第一站聚焦 Token
                      与生成循环。框架支持后续加入更多主题，保持统一的演示语言。
                    </p>
                  </div>
                  <div>
                    <span>03</span>
                    <p>
                      <strong>清楚区分模拟与真实</strong>
                      按词简化切分；候选与分数是教学预设，参数和抽样计算真实执行。这里没有连接模型，也不展示真实内部思考过程。
                    </p>
                  </div>
                </div>
                <div className="about-bottom">
                  <span>纯静态 · 无账号 · 无需 API Key</span>
                  <Dialog.Close className="button primary">
                    继续探索 <ArrowUpRight size={16} />
                  </Dialog.Close>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </Tooltip.Provider>
      </MotionConfig>
    </ReducedMotionContext.Provider>
  );
}
