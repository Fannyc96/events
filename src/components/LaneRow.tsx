import type { CSSProperties } from 'react';
import type { Category } from '../lib/categories';
import type { Column } from '../lib/dates';
import type { LaneLayout } from '../lib/layout';
import type { Scale } from '../lib/types';
import { ariaOf, cardClass, cardStyle } from './cardStyle';

interface Props {
  cat: Category;
  layout: LaneLayout;
  cols: Column[];
  scale: Scale;
  gridStyle: CSSProperties;
  onOpenEvent: (id: string) => void;
  onOpenList: (title: string, ids: string[], reorderable?: boolean) => void;
}

const span = (cs: number, ce: number) => `${cs + 1} / span ${ce - cs + 1}`;

export function LaneRow({ cat, layout, cols, scale, gridStyle, onOpenEvent, onOpenList }: Props) {
  const { band, cards, more } = layout;

  const colName = (col: number) =>
    scale === 'year' ? `${cols[col].sub ? cols[col].sub + ' 年 ' : ''}${cols[col].top}` : cols[col].top;

  return (
    <div className="lane" style={{ background: cat.main + '0F' }}>
      <div className="lane-label" style={{ background: cat.main }}>
        {cat.name}
      </div>
      <div className="lane-grid" style={gridStyle}>
        {band && (() => {
          const e = band.first;
          const many = band.ids.length > 1;
          const who = e.stakeholder ? e.stakeholder + '｜' : '';
          return (
            <button
              className="band"
              aria-label={`大致區間事件 ${who}${e.title}${many ? `，共 ${band.ids.length} 件，看全部` : ''}`}
              style={{
                gridColumn: span(band.cs, band.ce),
                background: e.important ? cat.light : cat.main + '24',
                fontWeight: e.important ? 700 : 400,
                ...(e.confirmed ? null : { outline: `1px dashed ${cat.main}`, outlineOffset: -1 }),
              }}
              onClick={() =>
                many
                  ? onOpenList(`${cat.name}・大致區間事件（${band.ids.length} 件）`, band.ids)
                  : onOpenEvent(e.id)
              }
            >
              {who}
              {e.title}（{e.date_label}）{many ? ` 等 ${band.ids.length} 件` : ''}
            </button>
          );
        })()}

        {cards.map((c) => (
          <button
            key={c.event.id}
            className={cardClass(c.event)}
            aria-label={ariaOf(c.event)}
            style={{ gridRow: c.row + 2, gridColumn: span(c.cs, c.ce), ...cardStyle(c.event, c.cutLeft, c.cutRight) }}
            onClick={() => onOpenEvent(c.event.id)}
          >
            <span className="card-text">
              {c.event.stakeholder && <strong>{c.event.stakeholder}</strong>} {c.event.title}
            </span>
          </button>
        ))}

        {more.map((m) => (
          <button
            key={m.col}
            className="more"
            aria-label={`${colName(m.col)}還有 ${m.n} 件，看全部`}
            style={{ gridColumn: m.col + 1, background: m.hasImportant ? 'var(--ink)' : cat.main }}
            onClick={() => onOpenList(`${cat.name}・${colName(m.col)}（${m.ids.length} 件）`, m.ids, true)}
          >
            +{m.n}
          </button>
        ))}
      </div>
    </div>
  );
}
