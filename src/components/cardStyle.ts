import type { CSSProperties } from 'react';
import { categoryOf } from '../lib/categories';
import type { EventRow } from '../lib/types';

/**
 * 卡片樣式（SPEC 4.3），可疊加：
 * 一般＝胡粉白底＋1.5px 主色框；重要＝淺色實底＋2px 框；未確定＝虛線；
 * 被範圍切斷的那一側不留圓角、不畫框線。
 * 大致日期：兩端淡出（.card.approx）＋左右框線完全拿掉。
 */
export function cardStyle(e: EventRow, cutLeft = false, cutRight = false): CSSProperties {
  const k = categoryOf(e.category);
  const l = cutLeft ? 0 : 5;
  const r = cutRight ? 0 : 5;
  const approx = e.date_precision === 'approx';
  return {
    borderRadius: `${l}px ${r}px ${r}px ${l}px`,
    background: e.important ? k.light : 'var(--card)',
    border: `${e.important ? 2 : 1.5}px ${e.confirmed ? 'solid' : 'dashed'} ${k.main}`,
    ...(cutLeft || approx ? { borderLeftWidth: 0 } : null),
    ...(cutRight || approx ? { borderRightWidth: 0 } : null),
  };
}

export function cardClass(e: EventRow): string {
  return e.date_precision === 'approx' ? 'card approx' : 'card';
}

export function ariaOf(e: EventRow): string {
  return `${e.stakeholder ? e.stakeholder + '：' : ''}${e.title}，${e.date_label}${e.important ? '，重要' : ''}${
    e.confirmed ? '' : '，未確定'
  }`;
}
