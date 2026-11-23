import { useSearchRun } from '../hooks/useSearchRun';
import type { CSSProperties } from 'react';
import { diffFields, type UpdateField } from '../lib/candidates';
import { categoryOf } from '../lib/categories';
import { statusText } from '../lib/searchTrigger';
import type { EventRow } from '../lib/types';
import { TimelineIcon } from './Icons';

interface Props {
  pending: EventRow[];
  /** 已核准事件（更新建議要對照的原事件） */
  originals: Map<string, EventRow>;
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
export function ReviewPage({ pending, originals, busyId, onBack, onSkip, onEdit, onApprove, onReload, flash }: Props) {
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
            // 更新建議：和原事件不同的欄位用紅字
            const original = p.update_of ? originals.get(p.update_of) : undefined;
            const changed = new Set<UpdateField>(original ? diffFields(original, p) : []);
            const red = (...fs: UpdateField[]): CSSProperties | undefined =>
              fs.some((f) => changed.has(f)) ? { color: 'var(--red)' } : undefined;
            const dateChanged = red('start_date', 'end_date', 'date_precision', 'date_label');
            return (
              <article key={p.id} className="review-card">
                <div className="review-meta">
                  <span className="ai-tag">{original ? 'AI 更新建議' : 'AI 建議'}</span>
                  {p.ai_reason && <span style={{ color: 'var(--ink-2)' }}>{p.ai_reason}</span>}
                </div>
                {/* 沿用事件詳情的樣式：分類在標題上方 → 標題 → 狀態 tag → 日期、地點 */}
                {original && <span className="update-note">更新既有事件，紅字為變更的內容</span>}
                <span className="detail-cat" style={{ color: cat.main, ...red('category') }}>
                  <span className="swatch" style={{ background: cat.main }} />
                  {cat.name}
                </span>
                <h2>
                  {p.stakeholder && (
                    <span className="who-tag" style={{ background: 'var(--card)', border: `2px solid ${cat.light}`, ...red('stakeholder') }}>
                      {p.stakeholder}
                    </span>
                  )}
                  <span style={red('title')}>{p.title}</span>
                </h2>
                <div className="tags">
                  {/* 確定／一般也顯示：白底有框；未確定：虛線框；重要：分類淺色底 */}
                  <span className="tag" style={{ border: `1px ${p.confirmed ? 'solid' : 'dashed'} ${cat.main}`, background: 'var(--card)', ...red('confirmed') }}>
                    {p.confirmed ? '已確定' : '未確定'}
                  </span>
                  {p.important ? (
                    <span className="tag" style={{ background: cat.light, border: `1px solid ${cat.light}`, fontWeight: 700, ...red('important') }}>
                      重要
                    </span>
                  ) : (
                    <span className="tag" style={{ border: `1px solid ${cat.main}`, background: 'var(--card)', ...red('important') }}>
                      一般
                    </span>
                  )}
                </div>
                <dl className="dl">
                  <dt>日期</dt>
                  <dd style={{ fontWeight: 700, ...dateChanged }}>{p.date_label}</dd>
                  <dt>地點</dt>
                  <dd style={red('location')}>{p.location || '—'}</dd>
                  {(p.note || changed.has('note')) && (
                    <>
                      <dt>備註</dt>
                      <dd className="note-box" style={red('note')}>
                        {p.note || '（刪除備註）'}
                      </dd>
                    </>
                  )}
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
