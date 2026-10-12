import { useEffect, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import {
  ArrowLeft,
  Check,
  List,
  Maximize,
  Minimize,
  Settings2,
  X,
  Zap,
  ZapOff,
} from 'lucide-react';

export function FocusToolbar({
  scene,
  topic,
  onDirectory,
  settingsOpen,
  onSettingsChange,
  reduced,
  systemReduced,
  onReducedChange,
}: {
  scene: number;
  topic: { id: string; title: string; scenes: readonly unknown[] };
  onDirectory: (trigger: HTMLElement) => void;
  settingsOpen: boolean;
  onSettingsChange: (open: boolean) => void;
  reduced: boolean;
  systemReduced: boolean;
  onReducedChange: () => void;
}) {
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [fullscreenError, setFullscreenError] = useState('');
  useEffect(() => {
    const change = () => {
      setFullscreen(Boolean(document.fullscreenElement));
      setFullscreenError('');
    };
    document.addEventListener('fullscreenchange', change);
    return () => document.removeEventListener('fullscreenchange', change);
  }, []);
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setFullscreenError('');
    } catch {
      setFullscreenError('浏览器暂时无法进入全屏，可继续在当前窗口观看。');
    }
  };
  return (
    <header className="focus-toolbar">
      <a className="focus-back" href="#/" aria-label="返回首页">
        <ArrowLeft size={18} />
        <span>返回</span>
      </a>
      <span className="toolbar-divider" />
      <div className="focus-topic">
        <span>
          LLM LENS <i>/</i> {topic.id.toUpperCase()}
        </span>
        <strong>{topic.title}</strong>
      </div>
      <div className="focus-toolbar-actions">
        <button
          className="toolbar-button"
          aria-label="探索目录"
          onClick={(event) => onDirectory(event.currentTarget)}
        >
          <List size={18} />
          <span>目录</span>
          {topic.id !== 'agent' && (
            <small>
              {scene + 1}/{topic.scenes.length}
            </small>
          )}
        </button>
        <button
          className="icon-button fullscreen-button"
          aria-label={fullscreen ? '退出全屏' : '进入全屏'}
          title={fullscreen ? '退出全屏' : '进入全屏'}
          disabled={!document.fullscreenEnabled}
          onClick={toggleFullscreen}
        >
          {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
        <Popover.Root open={settingsOpen} onOpenChange={onSettingsChange}>
          <Popover.Trigger asChild>
            <button className="icon-button" aria-label="显示设置" title="显示设置">
              <Settings2 size={18} />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="display-settings"
              sideOffset={12}
              align="end"
              collisionPadding={12}
              aria-label="显示设置"
            >
              <div className="settings-heading">
                <strong>显示设置</strong>
                <Popover.Close className="icon-button" aria-label="关闭显示设置">
                  <X size={17} />
                </Popover.Close>
              </div>
              <button
                className="motion-setting"
                disabled={systemReduced}
                onClick={onReducedChange}
                aria-pressed={reduced}
              >
                {reduced ? <ZapOff size={18} /> : <Zap size={18} />}
                <span>
                  <strong>减少动态效果</strong>
                  <small>{systemReduced ? '已遵循系统偏好' : '保留状态变化，减少移动动画'}</small>
                </span>
                {reduced && <Check size={16} />}
              </button>
              <p>
                {topic.id === 'agent'
                  ? '选择模型任务卡查看关联 · 点击详情查看数据'
                  : '← → 切换场景 · 悬停或点按概念查看解释'}
              </p>
              <span>教学模拟 · {topic.id === 'token' ? '按词简化展示' : '预设事件回放'}</span>
              <Popover.Arrow />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
      {fullscreenError && (
        <p className="fullscreen-feedback" role="status">
          {fullscreenError}
        </p>
      )}
    </header>
  );
}
