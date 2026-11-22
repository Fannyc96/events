import { describe, expect, it } from 'vitest';
import { emptyForm, normalizeForm, type FormState } from './form';

const base = (over: Partial<FormState>): FormState => ({ ...emptyForm('2026-11-21'), title: 'Summit', ...over });

describe('normalizeForm', () => {
  it('標題與開始日必填', () => {
    expect(normalizeForm(base({ title: '   ' }))).toEqual({ ok: false, error: '請填寫標題與開始日期' });
    expect(normalizeForm(base({ start: '' }))).toMatchObject({ ok: false });
  });

  it('單日：結束日 = 開始日，label 自動產生', () => {
    const r = normalizeForm(base({ precision: 'day', start: '2026-05-19', end: '2026-06-01' }));
    expect(r).toMatchObject({ ok: true, value: { start_date: '2026-05-19', end_date: '2026-05-19', date_label: '5/19' } });
  });

  it('多日：結束日早於開始日時對調', () => {
    const r = normalizeForm(base({ precision: 'range', start: '2026-05-31', end: '2026-05-29' }));
    expect(r).toMatchObject({ ok: true, value: { start_date: '2026-05-29', end_date: '2026-05-31', date_label: '5/29-31' } });
  });

  it('多日跨月', () => {
    const r = normalizeForm(base({ precision: 'range', start: '2026-11-30', end: '2026-12-02' }));
    expect(r).toMatchObject({ ok: true, value: { date_label: '11/30-12/2' } });
  });

  it('大致區間：有填顯示文字就用，留空時自動產生', () => {
    expect(normalizeForm(base({ precision: 'approx', start: '2026-08-01', end: '2026-09-30', label: ' Aug/Sep ' }))).toMatchObject({
      ok: true,
      value: { date_label: 'Aug/Sep', date_precision: 'approx' },
    });
    expect(normalizeForm(base({ precision: 'approx', start: '2026-08-01', end: '2026-09-30', label: '' }))).toMatchObject({
      ok: true,
      value: { date_label: '8/1-9/30' },
    });
  });

  it('空白的選填欄位存成 null，並去掉前後空白', () => {
    const r = normalizeForm(base({ title: ' G7 ', stakeholder: '  ', location: ' France ', note: '' }));
    expect(r).toMatchObject({ ok: true, value: { title: 'G7', stakeholder: null, location: 'France', note: null } });
  });
});
