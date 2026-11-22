import { categoryOf, PRECISION_TEXT } from '../lib/categories';
import { rangeText } from '../lib/dates';
import type { EventRow } from '../lib/types';
import { Sheet } from './Sheet';

interface Props {
  event: EventRow;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function EventDetail({ event: e, onClose, onEdit, onDelete }: Props) {
  const cat = categoryOf(e.category);
  return (
    <Sheet
      label="事件詳情"
      onClose={onClose}
      head={
        <span className="detail-cat">
          <span className="swatch" style={{ background: cat.main }} />
          {cat.name}
        </span>
      }
      footer={
        <>
          <button className="btn btn-danger-text" onClick={onDelete}>
            刪除
          </button>
          <button className="btn btn-dark" onClick={onEdit}>
            編輯
          </button>
        </>
      }
    >
      <div className="detail-body">
        <h2 className="detail-title">
          {e.stakeholder && <span className="who-tag">{e.stakeholder}</span>}
          {e.title}
        </h2>
        <dl className="dl">
          <dt>日期</dt>
          <dd style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontWeight: 700 }}>{e.date_label}</span>
            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              {PRECISION_TEXT[e.date_precision]} · {rangeText(e.date_precision, e.start_date, e.end_date)}
            </span>
          </dd>
          <dt>狀態</dt>
          <dd>{e.confirmed ? '已確定' : '未確定'}</dd>
          <dt>重要性</dt>
          <dd>{e.important ? '重要' : '一般'}</dd>
          <dt>地點</dt>
          <dd>{e.location || '—'}</dd>
          <dt>備註</dt>
          <dd className="note-box">{e.note || '—'}</dd>
        </dl>
      </div>
    </Sheet>
  );
}
