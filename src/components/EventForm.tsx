import { useState } from 'react';
import { CATEGORIES } from '../lib/categories';
import { normalizeForm, type FormState } from '../lib/form';
import type { EventInput, Precision } from '../lib/types';
import { Sheet } from './Sheet';

export type FormMode = 'add' | 'edit' | 'review';

interface Props {
  mode: FormMode;
  initial: FormState;
  busy: boolean;
  onSave: (value: EventInput) => void;
  onClose: () => void;
}

const HEADINGS: Record<FormMode, string> = { add: '新增事件', edit: '編輯事件', review: '編輯後核准' };
const PRECS: [Precision, string][] = [
  ['day', '單日'],
  ['range', '多日'],
  ['approx', '大致區間'],
];

const Req = () => (
  <span className="req" aria-hidden="true">
    *
  </span>
);

function Chips<T>({ label, options, value, onPick }: { label: string; options: [T, string][]; value: T; onPick: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span className="field" style={{ gap: 0 }}>
        {label}
      </span>
      <div className="chips">
        {options.map(([v, text]) => (
          <button key={String(v)} type="button" className="chip" aria-pressed={v === value} onClick={() => onPick(v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 新增、編輯、編輯後核准共用的表單（SPEC 第 5 節） */
export function EventForm({ mode, initial, busy, onSave, onClose }: Props) {
  const [f, setF] = useState<FormState>(initial);
  const [error, setError] = useState('');
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((prev) => ({ ...prev, [k]: v }));

  const save = () => {
    const r = normalizeForm(f);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError('');
    onSave(r.value);
  };

  return (
    <Sheet
      label={HEADINGS[mode]}
      head={<h2 style={{ fontSize: 18 }}>{HEADINGS[mode]}</h2>}
      headBorder
      onClose={onClose}
      height="94%"
      zIndex={11}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? '儲存中…' : mode === 'review' ? '核准加入' : '儲存'}
          </button>
        </>
      }
    >
      <form className="form-body" onSubmit={(e) => (e.preventDefault(), save())}>
        <label className="field">
          <span>
            標題
            <Req />
          </span>
          <input type="text" required value={f.title} onChange={(e) => set('title', e.target.value)} />
        </label>
        <div className="two-col">
          <label className="field">
            Stakeholder
            <input type="text" value={f.stakeholder} onChange={(e) => set('stakeholder', e.target.value)} />
          </label>
          <label className="field">
            地點
            <input type="text" value={f.location} onChange={(e) => set('location', e.target.value)} />
          </label>
        </div>
        <Chips label="分類" options={CATEGORIES.map((c) => [c.id, c.name])} value={f.category} onPick={(v) => set('category', v)} />
        <Chips label="日期類型" options={PRECS} value={f.precision} onPick={(v) => set('precision', v)} />
        <div className="two-col">
          <label className="field">
            <span>
              開始日
              <Req />
            </span>
            <input type="date" required value={f.start} onChange={(e) => set('start', e.target.value)} />
          </label>
          {f.precision !== 'day' && (
            <label className="field">
              結束日
              <input type="date" value={f.end} onChange={(e) => set('end', e.target.value)} />
            </label>
          )}
        </div>
        {f.precision === 'approx' && (
          <label className="field">
            顯示文字
            <input type="text" value={f.label} onChange={(e) => set('label', e.target.value)} />
            <span className="field-hint">畫面上顯示這段文字（如 Aug/Sep、春、上半年），位置用開始／結束日決定；留空就用日期範圍自動產生</span>
          </label>
        )}
        <div className="two-col">
          <Chips label="狀態" options={[[true, '已確定'], [false, '未確定']]} value={f.confirmed} onPick={(v) => set('confirmed', v)} />
          <Chips label="重要性" options={[[false, '一般'], [true, '重要']]} value={f.important} onPick={(v) => set('important', v)} />
        </div>
        <label className="field">
          備註
          <textarea value={f.note} onChange={(e) => set('note', e.target.value)} />
        </label>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
      </form>
    </Sheet>
  );
}
