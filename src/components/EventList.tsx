import { useEffect, useMemo, useRef, useState } from 'react';
import { compareEvents } from '../lib/layout';
import type { EventRow } from '../lib/types';
import { cardClass, cardStyle } from './cardStyle';
import { Sheet } from './Sheet';

interface Props {
  title: string;
  events: EventRow[];
  /** 可以長按拖曳調整順序（+N 清單） */
  reorderable: boolean;
  busy: boolean;
  onOpen: (id: string) => void;
  onClose: () => void;
  /** 依新順序存檔 */
  onReorder: (ids: string[]) => void;
  /** 清除手動排序 */
  onResetOrder: (ids: string[]) => void;
}

const LONG_PRESS_MS = 400;
const MOVE_CANCEL_PX = 8;

interface Drag {
  index: number;
  startY: number;
  dy: number;
  /** 各卡片中線的 Y（開始拖曳時量一次） */
  mids: number[];
  height: number;
}

/** 從 from 移到 to 之後的新陣列 */
function move<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

/** 點 +N 或合併細條打開的清單。+N 清單可長按卡片、上下拖曳調整順序。 */
export function EventList({ title, events, reorderable, busy, onOpen, onClose, onReorder, onResetOrder }: Props) {
  const sorted = useMemo(() => [...events].sort(compareEvents), [events]);
  const [order, setOrder] = useState(sorted);
  useEffect(() => setOrder(sorted), [sorted]);

  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;
  const press = useRef<{ index: number; y: number; timer: number } | null>(null);
  const suppressClick = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const orderRef = useRef(order);
  orderRef.current = order;

  // 拖曳時卡片要插入的位置
  const target = drag
    ? Math.max(0, Math.min(order.length - 1, drag.mids.filter((m, i) => i !== drag.index && m < drag.mids[drag.index] + drag.dy).length))
    : -1;
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (!reorderable) return;
    const el = listRef.current;
    if (!el) return;

    const itemIndex = (t: EventTarget | null) => {
      const item = (t as HTMLElement | null)?.closest?.('[data-idx]');
      return item ? Number(item.getAttribute('data-idx')) : -1;
    };
    const cancelPress = () => {
      if (press.current) window.clearTimeout(press.current.timer);
      press.current = null;
    };
    const startPress = (index: number, y: number) => {
      cancelPress();
      const timer = window.setTimeout(() => {
        const items = [...el.querySelectorAll<HTMLElement>('[data-idx]')];
        const rects = items.map((n) => n.getBoundingClientRect());
        navigator.vibrate?.(10);
        setDrag({ index, startY: y, dy: 0, mids: rects.map((r) => r.top + r.height / 2), height: rects[index].height });
        press.current = null;
      }, LONG_PRESS_MS);
      press.current = { index, y, timer };
    };
    const moveTo = (y: number, e: Event) => {
      if (dragRef.current) {
        e.preventDefault(); // 拖曳中不要捲動
        setDrag({ ...dragRef.current, dy: y - dragRef.current.startY });
      } else if (press.current && Math.abs(y - press.current.y) > MOVE_CANCEL_PX) {
        cancelPress(); // 手指移動了＝要捲動，不是長按
      }
    };
    const finish = () => {
      cancelPress();
      const d = dragRef.current;
      if (!d) return;
      suppressClick.current = true;
      window.setTimeout(() => (suppressClick.current = false), 50);
      setDrag(null);
      const to = targetRef.current;
      if (to !== d.index) {
        const next = move(orderRef.current, d.index, to);
        setOrder(next);
        onReorder(next.map((e) => e.id));
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      const i = itemIndex(e.target);
      if (i >= 0 && e.touches.length === 1) startPress(i, e.touches[0].clientY);
    };
    const onTouchMove = (e: TouchEvent) => moveTo(e.touches[0].clientY, e);
    const onMouseDown = (e: MouseEvent) => {
      const i = itemIndex(e.target);
      if (i >= 0 && e.button === 0) startPress(i, e.clientY);
    };
    const onMouseMove = (e: MouseEvent) => moveTo(e.clientY, e);

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', finish);
    el.addEventListener('touchcancel', finish);
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', finish);
    return () => {
      cancelPress();
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', finish);
      el.removeEventListener('touchcancel', finish);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', finish);
    };
  }, [reorderable, onReorder]);

  const hasManual = events.some((e) => e.manual_rank !== null && e.manual_rank !== undefined);
  const GAP = 8;

  return (
    <Sheet label={title} head={<h2>{title}</h2>} onClose={onClose} maxHeight="75%">
      <div className="list-body">
        {reorderable && (
          <div className="list-hint">
            <span>{busy ? '儲存順序中…' : '長按卡片可上下拖曳，調整在時間軸上的優先順序'}</span>
            {hasManual && !busy && (
              <button className="link-btn" onClick={() => onResetOrder(order.map((e) => e.id))}>
                恢復預設
              </button>
            )}
          </div>
        )}
        <div ref={listRef} className={`list-items${drag ? ' dragging' : ''}`}>
          {order.map((e, i) => {
            // 拖曳中：被拖的卡片跟著手指；其他卡片讓出位置
            let shift = 0;
            if (drag && i !== drag.index) {
              const step = drag.height + GAP;
              if (drag.index < i && i <= target) shift = -step;
              if (target <= i && i < drag.index) shift = step;
            }
            const isDragged = drag?.index === i;
            return (
              <button
                key={e.id}
                data-idx={i}
                className={`${cardClass(e)} list-item${isDragged ? ' is-dragged' : ''}`}
                style={{
                  ...cardStyle(e),
                  transform: isDragged ? `translateY(${drag!.dy}px) scale(1.02)` : shift ? `translateY(${shift}px)` : undefined,
                }}
                onClick={() => {
                  if (suppressClick.current || drag) return;
                  onOpen(e.id);
                }}
                onContextMenu={(ev) => reorderable && ev.preventDefault()}
              >
                <span>
                  {e.stakeholder && <strong>{e.stakeholder}</strong>} {e.title}{' '}
                  <span style={{ fontSize: 12, opacity: 0.85 }}>· {e.date_label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}
