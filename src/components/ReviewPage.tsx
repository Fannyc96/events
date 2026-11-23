import { useSearchRun } from '../hooks/useSearchRun';
import { categoryOf } from '../lib/categories';
import { statusText } from '../lib/searchTrigger';
import type { EventRow } from '../lib/types';
import { TimelineIcon } from './Icons';

interface Props {
  pending: EventRow[];
  busyId: string | null;
  onBack: () => void;
  onSkip: (e: EventRow) => void;
  onEdit: (e: EventRow) => void;
  onApprove: (e: EventRow) => void;
  /** 自動搜尋結束時重新讀取事件 */
  onReload: () => void;
  flash: (msg: string, ms?: number) => void;
}

/** 待審核頁（SPEC 第 6 節） */
export function ReviewPage({ pending, busyId, onBack, onSkip, onEdit, onApprove, onReload, flash }: Props) {
  const search = useSearchRun(onReload, flash);
  const failed = search.run && search.run.status === 'completed' && search.run.conclusion !== 'success';

  return (
    <div className="review">
      <div className="review-scroll">
        <div className="review-list">
          <p className="review-intro">新聞自動擷取的候選事件，可先編輯細項再核准</p>
          <div className="search-row">
            <span className="search-status" role="status">
              {!search.loaded ? '讀取搜尋狀態…' : search.error ? search.error : statusText(search.run)}
              {failed && search.run?.html_url && (
                <>
                  {' '}
                  <a href={search.run.html_url} target="_blank" rel="noopener noreferrer">
                    看紀錄
                  </a>
                </>
              )}
            </span>
            <button className="btn btn-primary search-btn" disabled={search.busy || search.running} onClick={() => void search.start()}>
              {search.running ? '搜尋中…' : search.busy ? '送出中…' : '立即搜尋'}
            </button>
          </div>
          {pending.length === 0 && <p className="review-empty">全部審核完畢</p>}
          {pending.map((p) => {
            const cat = categoryOf(p.category);
            const busy = busyId === p.id;
            return (
              <article key={p.id} className="review-card">
                <div className="review-meta">
                  <span className="ai-tag">AI 建議</span>
                  {p.ai_reason && <span style={{ color: 'var(--ink-2)' }}>{p.ai_reason}</span>}
                </div>
                {/* 沿用事件詳情的樣式：分類在標題上方 → 標題 → 狀態 tag → 日期、地點 */}
                <span className="detail-cat" style={{ color: cat.main }}>
                  <span className="swatch" style={{ background: cat.main }} />
                  {cat.name}
                </span>
                <h2>
                  {p.stakeholder && (
                    <span className="who-tag" style={{ background: 'var(--card)', border: `2px solid ${cat.light}` }}>
                      {p.stakeholder}
                    </span>
                  )}
                  {p.title}
                </h2>
                <div className="tags">
                  {/* 確定／一般也顯示：白底有框；未確定：虛線框；重要：分類淺色底 */}
                  <span className="tag" style={{ border: `1px ${p.confirmed ? 'solid' : 'dashed'} ${cat.main}`, background: 'var(--card)' }}>
                    {p.confirmed ? '已確定' : '未確定'}
                  </span>
                  {p.important ? (
                    <span className="tag" style={{ background: cat.light, border: `1px solid ${cat.light}`, fontWeight: 700 }}>
                      重要
                    </span>
                  ) : (
                    <span className="tag" style={{ border: `1px solid ${cat.main}`, background: 'var(--card)' }}>
                      一般
                    </span>
                  )}
                </div>
                <dl className="dl">
                  <dt>日期</dt>
                  <dd style={{ fontWeight: 700 }}>{p.date_label}</dd>
                  <dt>地點</dt>
                  <dd>{p.location || '—'}</dd>
                </dl>
                {(p.source_title || p.source_url) && (
                  <div className="review-source">
                    {p.source_url ? (
                      <a href={p.source_url} target="_blank" rel="noopener noreferrer">
                        {p.source_title || p.source_url}
                      </a>
                    ) : (
                      p.source_title
                    )}
                  </div>
                )}
                <div className="review-actions">
                  <button className="btn" disabled={busy} onClick={() => onSkip(p)}>
                    略過
                  </button>
                  <button className="btn btn-outline-primary" disabled={busy} onClick={() => onEdit(p)}>
                    編輯
                  </button>
                  <button className="btn btn-primary" disabled={busy} onClick={() => onApprove(p)}>
                    核准
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      {/* 頁首放在最下面；回時間軸在右邊 */}
      <div className="review-bar">
        <h1>待審核（{pending.length}）</h1>
        <button className="icon-btn" aria-label="回時間軸" onClick={onBack}>
          <TimelineIcon />
        </button>
      </div>
    </div>
  );
}
