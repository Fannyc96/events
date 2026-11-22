import { categoryOf } from '../lib/categories';
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
  const hasTags = !e.confirmed || e.important;
  return (
    <Sheet
      label="事件詳情"
      onClose={onClose}
      head={
        <span className="detail-cat" style={{ color: cat.main }}>
          <span className="swatch" style={{ background: cat.main }} />
          {cat.name}
        </span>
      }
      footer={
        <>
          <button className="btn" onClick={onDelete}>
            刪除
          </button>
          <button className="btn btn-primary" onClick={onEdit}>
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
        {hasTags && (
          <div className="tags">
            {/* 狀態：只有「未確定」才顯示，透明底＋虛線框 */}
            {!e.confirmed && (
              <span className="tag" style={{ border: `1px dashed ${cat.main}` }}>
                未確定
              </span>
            )}
            {/* 重要性：只有「重要」才顯示，分類淺色底 */}
            {e.important && (
              <span className="tag" style={{ background: cat.light, border: `1px solid ${cat.light}`, fontWeight: 700 }}>
                重要
              </span>
            )}
          </div>
        )}
        <dl className="dl">
          <dt>日期</dt>
          <dd style={{ fontWeight: 700 }}>{e.date_label}</dd>
          <dt>地點</dt>
          <dd>{e.location || '—'}</dd>
          <dt>備註</dt>
          <dd className="note-box">{e.note || '—'}</dd>
        </dl>
      </div>
    </Sheet>
  );
}
