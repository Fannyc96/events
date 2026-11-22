import { useState } from 'react';
import { md, parseDate, toIso, windowOf } from '../lib/dates';
import type { Scale } from '../lib/types';
import { ChevronLeft, ChevronRight } from './Icons';

interface Props {
  scale: Scale;
  anchor: string;
  today: string;
  onPick: (anchorIso: string) => void;
  onClose: () => void;
}

const HEADS = ['一', '二', '三', '四', '五', '六', '日'];

/** 小日曆（SPEC 4.5）：週＝月曆每列一週；月＝12 個月；年＝12 個年份（−4…+7） */
export function DatePicker({ scale, anchor, today, onPick, onClose }: Props) {
  const [cur, setCur] = useState(anchor);
  const cd = parseDate(cur);
  const py = cd.getFullYear();
  const pm = cd.getMonth();
  const aw = windowOf(scale, anchor);
  const t = parseDate(today);

  const step = (dir: number) => {
    const nx =
      scale === 'week'
        ? new Date(py, pm + dir, 1)
        : scale === 'month'
          ? new Date(py + dir, 0, 1)
          : new Date(py + 12 * dir, 0, 1);
    setCur(toIso(nx));
  };

  let title = '';
  let body: React.ReactNode = null;

  if (scale === 'week') {
    title = `${py} 年 ${pm + 1} 月`;
    const first = new Date(py, pm, 1);
    const start = new Date(py, pm, 1 - ((first.getDay() + 6) % 7));
    const rows: Date[] = [];
    for (let r = 0; r < 6; r++) {
      const mon = new Date(start.getFullYear(), start.getMonth(), start.getDate() + r * 7);
      if (r > 0 && mon.getMonth() !== pm) break;
      rows.push(mon);
    }
    body = (
      <div className="picker-weeks">
        <div aria-hidden="true" className="picker-heads">
          {HEADS.map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
        {rows.map((mon) => {
          const sel = toIso(mon) === toIso(aw.start);
          const end = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
          return (
            <button
              key={toIso(mon)}
              className="picker-week"
              aria-pressed={sel}
              aria-label={`${md(mon)} 到 ${md(end)} 這週`}
              onClick={() => onPick(toIso(mon))}
            >
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
                const cls = ['picker-day', d.getMonth() !== pm && 'other', toIso(d) === today && 'today'].filter(Boolean).join(' ');
                return (
                  <span key={i} className={cls}>
                    {d.getDate()}
                  </span>
                );
              })}
            </button>
          );
        })}
      </div>
    );
  } else if (scale === 'month') {
    title = `${py} 年`;
    body = (
      <div className="picker-grid">
        {Array.from({ length: 12 }, (_, q) => {
          const sel = aw.start.getFullYear() === py && aw.start.getMonth() === q;
          const isT = t.getFullYear() === py && t.getMonth() === q;
          return (
            <button key={q} className={`picker-cell${isT ? ' today' : ''}`} aria-pressed={sel} onClick={() => onPick(toIso(new Date(py, q, 1)))}>
              {q + 1} 月
            </button>
          );
        })}
      </div>
    );
  } else {
    const y0 = py - 4;
    title = `${y0} – ${y0 + 11}`;
    body = (
      <div className="picker-grid">
        {Array.from({ length: 12 }, (_, i) => {
          const yy = y0 + i;
          const sel = aw.start.getFullYear() === yy;
          const isT = t.getFullYear() === yy;
          return (
            <button key={yy} className={`picker-cell${isT ? ' today' : ''}`} aria-pressed={sel} onClick={() => onPick(toIso(new Date(yy, 0, 1)))}>
              {yy}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <div className="click-away" onClick={onClose} />
      <div role="dialog" aria-label="選擇日期" className="popover picker">
        <div className="picker-nav">
          <button aria-label="往前" onClick={() => step(-1)}>
            <ChevronLeft size={18} />
          </button>
          <h2>{title}</h2>
          <button aria-label="往後" onClick={() => step(1)}>
            <ChevronRight size={18} />
          </button>
        </div>
        {body}
        <div className="picker-actions">
          <button className="btn-primary" style={{ border: 'none', fontWeight: 700 }} onClick={() => onPick(today)}>
            回到今天
          </button>
          <button style={{ border: '1px solid var(--line)', background: 'var(--card)' }} onClick={onClose}>
            取消
          </button>
        </div>
      </div>
    </>
  );
}
