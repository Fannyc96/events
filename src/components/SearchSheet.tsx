import { useMemo, useState } from 'react';
import { futureEvents, searchEvents } from '../lib/search';
import type { EventRow } from '../lib/types';
import { cardClass, cardStyle } from './cardStyle';
import { Sheet } from './Sheet';

type Scope = 'view' | 'future';

interface Props {
  /** 目前畫面上的事件（已套用範圍與「只看重要」） */
  viewEvents: EventRow[];
  /** 所有已核准事件 */
  allEvents: EventRow[];
  today: string;
  onOpen: (id: string) => void;
  onClose: () => void;
}

/** 搜尋事件：可選「目前畫面」或「全部未來事件」 */
export function SearchSheet({ viewEvents, allEvents, today, onOpen, onClose }: Props) {
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<Scope>('view');
  const pool = scope === 'view' ? viewEvents : futureEvents(allEvents, today);
  const results = useMemo(() => searchEvents(pool, q), [pool, q]);

  return (
    <Sheet label="搜尋事件" head={<h2>搜尋事件</h2>} onClose={onClose} height="90%">
      <div className="search-body">
        <input
          className="search-input"
          type="search"
          value={q}
          autoFocus
          onChange={(e) => setQ(e.target.value)}
          aria-label="關鍵字"
        />
        <div className="chips" role="group" aria-label="搜尋範圍">
          <button className="chip" aria-pressed={scope === 'view'} onClick={() => setScope('view')}>
            目前畫面
          </button>
          <button className="chip" aria-pressed={scope === 'future'} onClick={() => setScope('future')}>
            全部未來事件
          </button>
        </div>
        {q.trim() && <p className="search-count">找到 {results.length} 件</p>}
        <div className="list-items">
          {results.map((e) => (
            <button key={e.id} className={`${cardClass(e)} list-item`} style={cardStyle(e)} onClick={() => onOpen(e.id)}>
              <span>
                {e.stakeholder && <strong>{e.stakeholder}</strong>} {e.title}{' '}
                <span style={{ fontSize: 12, opacity: 0.85 }}>· {e.date_label}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
