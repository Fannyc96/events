import type { Scale } from '../lib/types';
import { ChevronDown, ChevronLeft, ChevronRight, Dots, Inbox } from './Icons';

interface Props {
  title: string;
  titleFull: string;
  scale: Scale;
  pendingCount: number;
  pickerOpen: boolean;
  menuOpen: boolean;
  onPrev: () => void;
  onNext: () => void;
  onOpenPicker: () => void;
  onScale: (s: Scale) => void;
  onReview: () => void;
  onMenu: () => void;
}

const SCALES: [Scale, string][] = [
  ['week', '週'],
  ['month', '月'],
  ['year', '年'],
];

export function TopBar(p: Props) {
  return (
    <header className="topbar">
      <button className="icon-btn" aria-label="上一段" onClick={p.onPrev}>
        <ChevronLeft />
      </button>
      <button className="topbar-title" aria-label={`${p.titleFull}，選擇日期`} aria-expanded={p.pickerOpen} onClick={p.onOpenPicker}>
        {p.title}
        <ChevronDown />
      </button>
      <button className="icon-btn" aria-label="下一段" onClick={p.onNext}>
        <ChevronRight />
      </button>
      <div role="group" aria-label="時間範圍" className="seg">
        {SCALES.map(([s, label]) => (
          <button key={s} aria-pressed={p.scale === s} onClick={() => p.onScale(s)}>
            {label}
          </button>
        ))}
      </div>
      <button className="icon-btn" aria-label={`待審核 ${p.pendingCount} 件`} onClick={p.onReview}>
        <Inbox />
        {p.pendingCount > 0 && <span className="badge">{p.pendingCount}</span>}
      </button>
      <button className="icon-btn" aria-label="選項與圖例" aria-expanded={p.menuOpen} onClick={p.onMenu}>
        <Dots />
      </button>
    </header>
  );
}
