import { lazy, Suspense, useEffect, useRef, useState } from 'react';
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
import { FocusToolbar } from './FocusToolbar';
import { Home } from './Home';
import { parseRoute, sceneHref } from './route';
import { topic } from '../core/lesson';
const TokenDeck = lazy(() =>
  import('../features/token/TokenDeck').then((module) => ({ default: module.TokenDeck })),
);
const AgentDeck = lazy(() =>
  import('../features/agent-conversation/AgentDeck').then((module) => ({
    default: module.AgentDeck,
  })),
);
const GatewayDeck = lazy(() =>
  import('../features/model-gateway/GatewayDeck').then((module) => ({
    default: module.GatewayDeck,
  })),
);
const ProtocolDeck = lazy(() =>
  import('../features/protocols/ProtocolDeck').then((module) => ({ default: module.ProtocolDeck })),
);
import { protocolTopic } from '../core/protocols/lesson';
import { gatewayTopic } from '../core/model-gateway/flow';
import { agentTopic } from '../core/agent-conversation/fixtures';

export function App() {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  const activeTopic =
    route.page === 'protocols'
      ? protocolTopic
      : route.page === 'gateway'
        ? gatewayTopic
        : route.page === 'agent'
          ? agentTopic
          : topic;
  const [about, setAbout] = useState(false);
  const aboutTrigger = useRef<HTMLElement | null>(null);
  const openAbout = (trigger: HTMLElement) => {
    aboutTrigger.current = trigger;
    setAbout(true);
  };
  const [directory, setDirectory] = useState(false);
  const directoryTrigger = useRef<HTMLElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openDirectory = (trigger: HTMLElement) => {
    directoryTrigger.current = trigger;
    setDirectory(true);
  };
  const preferredReduced = useSystemReducedMotion();
  const [reduced, setReduced] = useState(false);
  const reduceMotion = Boolean(preferredReduced || reduced);
  useEffect(() => {
    const change = () => {
      setRoute(parseRoute(location.hash));
      setDirectory(false);
      setSettingsOpen(false);
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reduceMotion);
  }, [reduceMotion]);
  useEffect(() => {
    if (route.page === 'home' && document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
    document.title = `${route.page === 'home' ? '看见语言模型如何生成' : activeTopic.scenes[route.scene].short} · LLM Lens`;
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
          <div className={route.page !== 'home' ? 'focus-shell' : 'home-shell'}>
            {route.page === 'home' ? (
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
            ) : (
              <FocusToolbar
                topic={activeTopic}
                scene={route.scene}
                onDirectory={openDirectory}
                settingsOpen={settingsOpen}
                onSettingsChange={setSettingsOpen}
                reduced={reduceMotion}
                systemReduced={Boolean(preferredReduced)}
                onReducedChange={() => setReduced(!reduced)}
              />
            )}
            {route.page === 'home' ? (
              <Home onAbout={openAbout} />
            ) : route.page === 'protocols' ? (
              <Suspense
                fallback={
                  <main className="deck-page" id="main-content">
                    <p role="status">正在打开协议演示…</p>
                  </main>
                }
              >
                <ProtocolDeck suspended={directory || settingsOpen || about} />
              </Suspense>
            ) : route.page === 'gateway' ? (
              <Suspense
                fallback={
                  <main className="deck-page" id="main-content">
                    <p role="status">正在打开网关演示…</p>
                  </main>
                }
              >
                <GatewayDeck suspended={directory || settingsOpen || about} />
              </Suspense>
            ) : route.page === 'agent' ? (
              <Suspense
                fallback={
                  <main className="deck-page" id="main-content">
                    <p role="status">正在打开 Agent 演示…</p>
                  </main>
                }
              >
                <AgentDeck suspended={directory || settingsOpen || about} />
              </Suspense>
            ) : (
              <Suspense
                fallback={
                  <main className="deck-page" id="main-content">
                    <p role="status">正在打开 Token 演示…</p>
                  </main>
                }
              >
                <TokenDeck scene={route.scene} suspended={directory || settingsOpen || about} />
              </Suspense>
            )}
          </div>
          <Dialog.Root open={directory} onOpenChange={setDirectory}>
            {route.page === 'home' && (
              <button
                className="directory-trigger"
                aria-label="探索目录"
                onClick={(event) => openDirectory(event.currentTarget)}
                aria-expanded={directory}
              >
                <List size={18} />
                <span>探索目录</span>
              </button>
            )}
            <Dialog.Portal>
              <Dialog.Overlay className="modal-overlay directory-overlay" />
              <Dialog.Content
                className="directory-panel"
                aria-describedby="directory-description"
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  const trigger = directoryTrigger.current;
                  if (trigger?.isConnected) trigger.focus();
                  else
                    (
                      document.querySelector('[aria-label="探索目录"]') as HTMLElement | null
                    )?.focus();
                }}
              >
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
                {[topic, agentTopic, gatewayTopic, protocolTopic].map((entry) => (
                  <div key={entry.id}>
                    <div className="directory-topic">
                      <BookOpen size={18} />
                      <div>
                        <strong>{entry.title}</strong>
                        <span>
                          {entry.subtitle} · {entry.duration}
                        </span>
                      </div>
                    </div>
                    <div className="directory-scenes">
                      {entry.scenes.map((s, i) => (
                        <a
                          href={sceneHref(
                            i,
                            entry.id as 'token' | 'agent' | 'gateway' | 'protocols',
                          )}
                          onClick={() => setDirectory(false)}
                          key={s.short}
                          aria-current={
                            route.page === entry.id && route.page !== 'home' && route.scene === i
                              ? 'page'
                              : undefined
                          }
                        >
                          <span>{String(i + 1).padStart(2, '0')}</span>
                          <strong>{s.short}</strong>
                          <ChevronRight size={16} />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="directory-tip">
                  <Command size={14} /> Token 演示可使用 ← → 切换场景
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
