import { compareImportantFirst } from '../lib/layout';
import type { EventRow } from '../lib/types';
import { cardClass, cardStyle } from './cardStyle';
import { Sheet } from './Sheet';

interface Props {
  title: string;
  events: EventRow[];
  onOpen: (id: string) => void;
  onClose: () => void;
}

/** 點 +N 或合併細條打開的清單 */
export function EventList({ title, events, onOpen, onClose }: Props) {
  const items = [...events].sort(compareImportantFirst);
  return (
    <Sheet label={title} head={<h2>{title}</h2>} onClose={onClose} maxHeight="75%">
      <div className="list-body">
        {items.map((e) => (
          <button key={e.id} className={`${cardClass(e)} list-item`} style={cardStyle(e)} onClick={() => onOpen(e.id)}>
            <span>
              {e.stakeholder && <strong>{e.stakeholder}</strong>} {e.title}{' '}
              <span style={{ fontSize: 12, opacity: 0.85 }}>· {e.date_label}</span>
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
