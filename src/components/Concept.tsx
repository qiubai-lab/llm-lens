import { useState, type ReactNode } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Popover from '@radix-ui/react-popover';
import { Info } from 'lucide-react';

type Props = { title: string; children: ReactNode; compact?: boolean };
export function Concept({ title, children, compact }: Props) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const explanation = (
    <>
      <strong>{title}</strong>
      <div>{children}</div>
    </>
  );
  return (
    <Popover.Root open={pinned} onOpenChange={setPinned}>
      <Tooltip.Root open={hovered && !pinned} onOpenChange={setHovered}>
        <Tooltip.Trigger asChild>
          <Popover.Trigger asChild>
            <button className={`concept ${compact ? 'compact' : ''}`} aria-label={`解释：${title}`}>
              {compact ? <Info size={15} /> : title}
            </button>
          </Popover.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="concept-bubble" sideOffset={9} collisionPadding={16}>
            {explanation}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <Popover.Portal>
        <Popover.Content
          className="concept-bubble"
          sideOffset={9}
          collisionPadding={16}
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-label={`${title}解释`}
        >
          {explanation}
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
export const definitions = {
  Token:
    '模型处理文本的基本片段，可能是字、子词、标点等。本演示按词与短语简化切分，并非真实 tokenizer 的结果。',
  Temperature:
    '用温度缩放候选分数后计算概率。低温让分布更集中，高温让分布更平缓；不会增加模型的知识。',
  'Top-k': '只保留概率排名前 k 的候选。本演示中“不限制”表示跳过这一筛选。',
  'Top-p': '从高概率到低概率累加，保留累计概率达到 p 的最小候选集合。包括跨过阈值的那个候选。',
  概率: '在当前上下文和设置下，一个候选被选中的机会。本演示只使用预设候选，数值不来自真实模型。',
  上下文: '模型生成下一 token 时可用的信息。这里包括开始的句子和已经生成的词。',
  自回归: '把已生成的内容作为下一次预测的输入，反复执行“预测 → 选择 → 追加”。',
};
