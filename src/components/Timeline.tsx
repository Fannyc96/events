import { useLayoutEffect, useMemo, useRef } from 'react';
import { CATEGORIES } from '../lib/categories';
import { buildColumns, type Window } from '../lib/dates';
import { layoutLane } from '../lib/layout';
import type { EventRow } from '../lib/types';
import { LaneRow } from './LaneRow';

interface Props {
  win: Window;
  today: string;
  events: EventRow[];
  onOpenEvent: (id: string) => void;
  onOpenList: (title: string, ids: string[]) => void;
}

const LABEL_W = 30;
const PAD = 4;
const GAP = 4;

export function Timeline({ win, today, events, onOpenEvent, onOpenList }: Props) {
  const cols = useMemo(() => buildColumns(win, today), [win, today]);
  const n = cols.length;
  const colW = win.scale === 'month' ? 76 : 104;
  const gridW = n * colW;
  const cw = (gridW - PAD * 2 - (n - 1) * GAP) / n; // 實際每欄內容寬
  const todayIdx = cols.findIndex((c) => c.today);
  const todayLeft = todayIdx >= 0 ? LABEL_W + PAD + todayIdx * (cw + GAP) : -1;

  const gridStyle = { gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` };

  const lanes = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        cat,
        layout: layoutLane(
          events.filter((e) => e.category === cat.id),
          win,
          n,
        ),
      })),
    [events, win, n],
  );

  // 切換範圍或日期時，捲到今天的前一欄；今天不在範圍內就捲到最左邊
  const scrollRef = useRef<HTMLDivElement>(null);
  const key = `${win.scale}|${win.start.getTime()}`;
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = todayLeft >= 0 ? Math.max(0, todayLeft - LABEL_W - (cw + GAP)) : 0;
  }, [key]);

  return (
    <div className="tl-scroll" ref={scrollRef}>
      <div className="tl-inner" style={{ width: LABEL_W + gridW }}>
        <div className="tl-head">
          <div className="tl-corner" />
          <div className="tl-head-grid" style={gridStyle}>
            {cols.map((c, i) => (
              <div key={i} className={`tl-head-cell${c.today ? ' today' : c.weekend ? ' weekend' : ''}`}>
                <span className="tl-head-top">{c.top}</span>
                {c.sub && <span className="tl-head-sub">{c.sub}</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="tl-lanes">
          {lanes.map(({ cat, layout }) => (
            <LaneRow
              key={cat.id}
              cat={cat}
              layout={layout}
              cols={cols}
              scale={win.scale}
              gridStyle={gridStyle}
              onOpenEvent={onOpenEvent}
              onOpenList={onOpenList}
            />
          ))}
        </div>
        {todayLeft >= 0 && <div aria-hidden="true" className="today-col" style={{ left: todayLeft, width: cw }} />}
      </div>
    </div>
  );
}
