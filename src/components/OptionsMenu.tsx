import type { CSSProperties } from 'react';

interface Props {
  onlyImportant: boolean;
  onToggleImportant: () => void;
  onClose: () => void;
}

// 圖例以 defense 為例（原型同）
const MAIN = '#2D6D4B';
const LIGHT = '#A8D8B9';
const FADE: CSSProperties = {
  WebkitMaskImage: 'linear-gradient(90deg, transparent 0, #000 10px, #000 calc(100% - 10px), transparent 100%)',
  maskImage: 'linear-gradient(90deg, transparent 0, #000 10px, #000 calc(100% - 10px), transparent 100%)',
};

const LEGEND: [CSSProperties, string][] = [
  [{ background: 'var(--card)', border: `1.5px solid ${MAIN}` }, '一般'],
  [{ background: LIGHT, border: `2px solid ${MAIN}` }, '重要：淺色實底＋粗框'],
  [{ background: 'var(--card)', border: `1.5px dashed ${MAIN}` }, '未確定：虛線框'],
  [{ background: 'var(--card)', border: `1.5px solid ${MAIN}`, ...FADE }, '大致日期：兩端淡出'],
  [{ height: 12, background: MAIN + '24', borderRadius: 3, ...FADE }, '橫跨大半區間的大致事件'],
];

export function OptionsMenu({ onlyImportant, onToggleImportant, onClose }: Props) {
  return (
    <>
      <div className="click-away" onClick={onClose} />
      <div role="dialog" aria-label="選項與圖例" className="popover menu">
        <button role="switch" aria-checked={onlyImportant} className="switch-row" onClick={onToggleImportant}>
          只看重要事件
          <span className="switch" aria-hidden="true" />
        </button>
        <p className="legend-title">圖例（以 defense 為例）</p>
        {LEGEND.map(([style, text]) => (
          <div key={text} className="legend-row">
            <span className="legend-swatch" style={style} />
            {text}
          </div>
        ))}
        <div className="legend-row">
          <span style={{ flex: 'none', width: 58 }}>
            <span className="more" style={{ display: 'inline-block', background: MAIN, cursor: 'default' }}>
              +2
            </span>
          </span>
          放不下的事件（黑色＝含重要）
        </div>
        <button className="btn" style={{ marginTop: 8, height: 40, borderRadius: 10, fontSize: 14 }} onClick={onClose}>
          完成
        </button>
      </div>
    </>
  );
}
