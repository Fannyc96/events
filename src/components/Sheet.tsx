import { useEffect, type ReactNode } from 'react';
import { Close } from './Icons';

interface Props {
  label: string;
  /** 標題列左側內容（標題或分類色塊） */
  head: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** 面板高度：'auto' 時以 maxHeight 為上限 */
  height?: string;
  maxHeight?: string;
  zIndex?: number;
  headBorder?: boolean;
}

/** 從底部彈出的面板（詳情、清單、表單共用） */
export function Sheet({ label, head, onClose, children, footer, height, maxHeight = '82%', zIndex, headBorder }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" style={{ zIndex }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={label} className="sheet" style={{ height, maxHeight: height ? undefined : maxHeight }}>
        <div className="sheet-head" style={headBorder ? { borderBottom: '1px solid var(--line)', paddingBottom: 12 } : undefined}>
          {head}
          <button className="sheet-close" aria-label="關閉" onClick={onClose}>
            <Close />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}
